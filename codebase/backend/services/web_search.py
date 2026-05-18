"""
Web Search Service — Searches the web for supplementary information.

Supports:
  - Exa API (neural search, preferred)
  - Firecrawl API (deep crawling)
  - Fallback: simulated search results (for local-only operation)

Set EXA_API_KEY or FIRECRAWL_API_KEY in .env to enable real web search.
"""

import json
from typing import Optional
import httpx

from config import EXA_API_KEY, FIRECRAWL_API_KEY


class WebSearchService:
    """Searches the web for supplementary research information."""

    def __init__(self):
        self.exa_key = EXA_API_KEY
        self.firecrawl_key = FIRECRAWL_API_KEY

    async def search(self, query: str, num_results: int = 5) -> list[dict]:
        """
        Search the web for information related to the query.
        Returns a list of source dicts with text, filename, and score.
        Falls back gracefully if no API keys are configured.
        """
        if self.exa_key:
            return await self._search_exa(query, num_results)
        elif self.firecrawl_key:
            return await self._search_firecrawl(query, num_results)
        else:
            # Return empty — no web search available
            return []

    async def _search_exa(self, query: str, num_results: int) -> list[dict]:
        """Search using Exa's neural search API."""
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    "https://api.exa.ai/search",
                    headers={
                        "x-api-key": self.exa_key,
                        "Content-Type": "application/json",
                    },
                    json={
                        "query": query,
                        "numResults": num_results,
                        "useAutoprompt": True,
                        "type": "auto",
                    },
                )
                data = resp.json()
                results = data.get("results", [])
                return [
                    {
                        "text": r.get("text", r.get("title", "")),
                        "filename": f"web: {r.get('url', 'unknown')}",
                        "page": 1,
                        "score": 0.5,
                        "source_type": "web",
                        "url": r.get("url", ""),
                        "title": r.get("title", ""),
                    }
                    for r in results
                ]
        except Exception:
            return []

    async def _search_firecrawl(self, query: str, num_results: int) -> list[dict]:
        """Search using Firecrawl API."""
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    "https://api.firecrawl.dev/v1/search",
                    headers={
                        "Authorization": f"Bearer {self.firecrawl_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "query": query,
                        "limit": num_results,
                    },
                )
                data = resp.json()
                results = data.get("data", [])
                return [
                    {
                        "text": r.get("description", r.get("title", "")),
                        "filename": f"web: {r.get('url', 'unknown')}",
                        "page": 1,
                        "score": 0.5,
                        "source_type": "web",
                        "url": r.get("url", ""),
                        "title": r.get("title", ""),
                    }
                    for r in results
                ]
        except Exception:
            return []
