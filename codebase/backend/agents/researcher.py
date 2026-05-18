"""
Researcher Agent — Gathers information from multiple sources.

This agent:
  - Searches the vector database (documents) for relevant chunks
  - Performs web search (if configured)
  - Gathers comprehensive information on each sub-question
  - Returns structured findings with source attribution
"""

import json
from agents.base import BaseAgent, AgentInput, AgentOutput

RESEARCHER_SYSTEM_PROMPT = """You are a thorough research agent. Your role is to:

1. Search for and gather comprehensive information on the given research questions
2. Extract key facts, data points, quotes, and citations from sources
3. Organize findings by topic, highlighting supporting evidence
4. Note conflicting information or gaps in coverage
5. Always attribute information to specific sources

When presenting findings:
- Be precise: include specific numbers, dates, names
- Be balanced: present multiple perspectives if they exist
- Be transparent: note confidence levels for different claims
- Structure information logically by theme

If you don't have enough information to address something, say so explicitly."""


class ResearcherAgent(BaseAgent):
    """Gathers and organizes information from available sources."""

    def __init__(self, temperature: float = 0.2):
        super().__init__("researcher", RESEARCHER_SYSTEM_PROMPT, temperature)

    async def run(self, inp: AgentInput) -> AgentOutput:
        prompt = self._build_prompt(inp)
        prompt += """

## Output Format
Provide your findings organized as:

### Summary
Brief overview of what was found.

### Key Findings (by theme)
For each theme/area:
- **Finding**: What was found
- **Evidence**: Specific supporting details with source references
- **Confidence**: High/Medium/Low

### Information Gaps
What's missing or unclear and needs further investigation.

### Sources Used
List all sources referenced."""
        content = await self.llm.generate(prompt)

        # Extract structured findings from the content
        return AgentOutput(
            content=content,
            findings=[{"type": "research_findings", "content": content}],
            metadata={"role": self.role},
        )
