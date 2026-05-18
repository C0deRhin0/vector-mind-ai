"""
Analyst Agent — Synthesizes research findings.

This agent:
  - Identifies patterns, themes, and connections across findings
  - Detects contradictions between sources
  - Extracts key insights and implications
  - Ranks information by relevance and reliability
  - Builds a coherent synthesis from disparate findings
"""

import json
from agents.base import BaseAgent, AgentInput, AgentOutput

ANALYST_SYSTEM_PROMPT = """You are a senior research analyst. Your role is to:

1. Synthesize findings from multiple sources into a coherent picture
2. Identify patterns, trends, and recurring themes across the research
3. Detect contradictions, inconsistencies, or disagreements between sources
4. Evaluate the strength of evidence for different claims
5. Extract actionable insights and implications
6. Flag areas where conclusions are tentative vs well-supported

Think like a detective connecting clues. Look for:
- Confirming evidence: multiple independent sources agreeing
- Contradictory evidence: sources disagreeing on key points
- Nuanced findings: "it depends" situations where context matters
- Gaps: important questions that remain unanswered

Output a structured analysis that separates observations from interpretations."""


class AnalystAgent(BaseAgent):
    """Synthesizes findings, detects patterns and contradictions."""

    def __init__(self, temperature: float = 0.3):
        super().__init__("analyst", ANALYST_SYSTEM_PROMPT, temperature)

    async def run(self, inp: AgentInput) -> AgentOutput:
        prompt = self._build_prompt(inp)
        prompt += """

## Output Format
Provide your analysis structured as:

### Executive Synthesis
2-3 paragraph summary of what the research reveals overall.

### Key Themes & Patterns
For each major theme:
- **Theme**: Description
- **Supporting Evidence**: What supports it
- **Confidence**: High/Medium/Low

### Contradictions & Debates
For each contradiction found:
- **Claim A**: What one set of sources says
- **Claim B**: What another set says
- **Assessment**: Your evaluation of the evidence on each side

### Key Insights
Actionable takeaways and implications.

### Open Questions
What remains unclear and would benefit from further investigation."""
        content = await self.llm.generate(prompt)
        return AgentOutput(
            content=content,
            findings=[{"type": "analysis", "content": content}],
            metadata={"role": self.role},
        )
