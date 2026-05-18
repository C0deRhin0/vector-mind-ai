"""
Multi-provider LLM abstraction layer.

Supports:
  - Ollama (local, default)
  - OpenAI (GPT-4o, GPT-4, GPT-3.5)
  - Anthropic (Claude)
  - Google (Gemini)

Each agent receives a configured LLM instance with its own system prompt.
"""

import json
from typing import AsyncGenerator
from abc import ABC, abstractmethod

import httpx
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic

from config import (
    LLM_PROVIDER,
    OLLAMA_URL, OLLAMA_MODEL,
    OPENAI_API_KEY, OPENAI_MODEL,
    ANTHROPIC_API_KEY, ANTHROPIC_MODEL,
    GOOGLE_API_KEY, GOOGLE_MODEL,
)


class LLMProvider(ABC):
    """Abstract base for all LLM providers."""

    def __init__(self, model: str, system_prompt: str = "", temperature: float = 0.3):
        self.model = model
        self.system_prompt = system_prompt
        self.temperature = temperature

    @abstractmethod
    async def generate(self, prompt: str) -> str:
        """Generate a complete response."""
        ...

    @abstractmethod
    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        """Stream response tokens."""
        ...


class OllamaProvider(LLMProvider):
    """Local LLM via Ollama."""

    def __init__(self, system_prompt: str = "", temperature: float = 0.3):
        super().__init__(OLLAMA_MODEL, system_prompt, temperature)
        self.base_url = OLLAMA_URL.rstrip("/")

    async def generate(self, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=300) as client:
            resp = await client.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "system": self.system_prompt,
                    "stream": False,
                    "options": {
                        "temperature": self.temperature,
                        "num_ctx": 8192,
                    },
                },
            )
            data = resp.json()
            return data.get("response", "")

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        async with httpx.AsyncClient(timeout=300) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "system": self.system_prompt,
                    "stream": True,
                    "options": {
                        "temperature": self.temperature,
                        "num_ctx": 8192,
                    },
                },
            ) as resp:
                async for line in resp.aiter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            token = data.get("response", "")
                            if token:
                                yield token
                            if data.get("done"):
                                break
                        except json.JSONDecodeError:
                            continue


class OpenAIProvider(LLMProvider):
    """OpenAI / Azure OpenAI."""

    def __init__(self, system_prompt: str = "", temperature: float = 0.3):
        super().__init__(OPENAI_MODEL, system_prompt, temperature)
        self.client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    async def generate(self, prompt: str) -> str:
        resp = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt},
            ],
            temperature=self.temperature,
        )
        return resp.choices[0].message.content or ""

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt},
            ],
            temperature=self.temperature,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield delta.content


class AnthropicProvider(LLMProvider):
    """Anthropic Claude."""

    def __init__(self, system_prompt: str = "", temperature: float = 0.3):
        super().__init__(ANTHROPIC_MODEL, system_prompt, temperature)
        self.client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

    async def generate(self, prompt: str) -> str:
        resp = await self.client.messages.create(
            model=self.model,
            system=self.system_prompt,
            messages=[{"role": "user", "content": prompt}],
            temperature=self.temperature,
            max_tokens=8192,
        )
        return resp.content[0].text if resp.content else ""

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        async with self.client.messages.stream(
            model=self.model,
            system=self.system_prompt,
            messages=[{"role": "user", "content": prompt}],
            temperature=self.temperature,
            max_tokens=8192,
        ) as stream:
            async for text in stream.text_stream:
                yield text


class GoogleProvider(LLMProvider):
    """Google Gemini via generative AI SDK."""

    def __init__(self, system_prompt: str = "", temperature: float = 0.3):
        super().__init__(GOOGLE_MODEL, system_prompt, temperature)

    async def generate(self, prompt: str) -> str:
        try:
            from google import genai
            client = genai.Client(api_key=GOOGLE_API_KEY)
            resp = client.models.generate_content(
                model=self.model,
                contents=prompt,
                config={
                    "system_instruction": self.system_prompt,
                    "temperature": self.temperature,
                },
            )
            return resp.text or ""
        except Exception as e:
            return f"[Gemini error: {e}]"

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        try:
            from google import genai
            client = genai.Client(api_key=GOOGLE_API_KEY)
            resp = client.models.generate_content_stream(
                model=self.model,
                contents=prompt,
                config={
                    "system_instruction": self.system_prompt,
                    "temperature": self.temperature,
                },
            )
            for chunk in resp:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            yield f"[Gemini error: {e}]"


# ─── Factory ────────────────────────────────────────────

def create_llm(system_prompt: str = "", temperature: float = 0.3) -> LLMProvider:
    """Create an LLM provider based on configuration."""
    provider = LLM_PROVIDER.lower()

    if provider == "openai":
        return OpenAIProvider(system_prompt, temperature)
    elif provider == "anthropic":
        return AnthropicProvider(system_prompt, temperature)
    elif provider == "google":
        return GoogleProvider(system_prompt, temperature)
    else:
        return OllamaProvider(system_prompt, temperature)
