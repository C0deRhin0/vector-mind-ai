"""
Base Agent — all specialized agents inherit from this.

Each agent has:
  - A role name (e.g. "planner", "researcher")
  - A system prompt defining its expertise
  - An LLM provider instance
  - Access to tools/knowledge as needed
  - Structured input/output via AgentInput / AgentOutput
"""

from typing import AsyncGenerator, Optional
from pydantic import BaseModel
from core.llm import create_llm, LLMProvider


class AgentInput(BaseModel):
    """Standardized input for all agents."""
    query: str                          # The original research question
    context: str = ""                   # Previous agents' output / accumulated context
    instructions: str = ""              # Specific task instructions for this agent
    sources: list[dict] = []            # Retrieved source chunks
    parameters: dict = {}               # Extra parameters (format, depth, etc.)


class AgentOutput(BaseModel):
    """Standardized output from all agents."""
    content: str                        # The agent's response
    findings: list[dict] = []           # Structured findings (claims, sources, etc.)
    confidence: float = 0.0             # 0.0 to 1.0
    metadata: dict = {}                 # Extra info (tokens used, time, etc.)


class BaseAgent:
    """Base class for all research agents."""

    def __init__(
        self,
        role: str,
        system_prompt: str,
        temperature: float = 0.3,
    ):
        self.role = role
        self.system_prompt = system_prompt
        self.temperature = temperature
        self.llm: LLMProvider = create_llm(system_prompt, temperature)

    async def run(self, inp: AgentInput) -> AgentOutput:
        """Execute the agent's task. Override in subclasses."""
        prompt = self._build_prompt(inp)
        content = await self.llm.generate(prompt)
        return AgentOutput(content=content, metadata={"role": self.role})

    async def stream(self, inp: AgentInput) -> AsyncGenerator[str, None]:
        """Stream the agent's response token by token."""
        prompt = self._build_prompt(inp)
        async for token in self.llm.stream(prompt):
            yield token

    def _build_prompt(self, inp: AgentInput) -> str:
        """Build a prompt from the agent input."""
        parts = []

        if inp.context:
            parts.append(f"## Previous Context\n{inp.context}\n")

        if inp.sources:
            sources_text = "\n\n".join(
                f"[Source {i+1}: {s.get('filename', 'unknown')}]\n{s.get('text', '')}"
                for i, s in enumerate(inp.sources[:20])
            )
            parts.append(f"## Source Material\n{sources_text}\n")

        if inp.instructions:
            parts.append(f"## Task\n{inp.instructions}")

        parts.append(f"## Research Question\n{inp.query}")

        if inp.parameters.get("output_format"):
            parts.append(f"## Output Format\n{inp.parameters['output_format']}")

        return "\n\n".join(parts)
