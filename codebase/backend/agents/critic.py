"""
Critic Agent — Reviews outputs for quality, gaps, and weaknesses.

This adversarial reviewer:
  - Identifies logical gaps and unsupported claims
  - Flags overreach or conclusions not supported by evidence
  - Checks for missing perspectives or alternative interpretations
  - Evaluates the strength of the overall argument
  - Suggests specific improvements
"""

import json
from agents.base import BaseAgent, AgentInput, AgentOutput

CRITIC_SYSTEM_PROMPT = """You are a rigorous academic reviewer and editor. Your role is to critically evaluate research outputs:

1. **Logical gaps**: Does the reasoning chain hold? Are there leaps without evidence?
2. **Unsupported claims**: Are all factual claims backed by cited sources?
3. **Missing perspectives**: Are there viewpoints, counterarguments, or angles not considered?
4. **Overreach**: Does the output claim more certainty than the evidence supports?
5. **Structural issues**: Is the content well-organized? Are there redundancies or omissions?
6. **Clarity**: Are there ambiguous terms, jargon, or unclear passages?

Be critical but constructive. For each issue found:
- State the problem clearly
- Explain why it matters
- Suggest how to fix it

Rate the overall quality on: strength_of_evidence, reasoning_quality, completeness, clarity.
Use a 1-5 scale for each."""


class CriticAgent(BaseAgent):
    """Reviews and critiques research outputs."""

    def __init__(self, temperature: float = 0.2):
        super().__init__("critic", CRITIC_SYSTEM_PROMPT, temperature)

    async def run(self, inp: AgentInput) -> AgentOutput:
        prompt = self._build_prompt(inp)
        prompt += """

## Output Format
Provide your review as:

### Overall Assessment
Brief summary of the output's strengths and weaknesses.

### Issues Found
For each issue:
- **Severity**: High/Medium/Low
- **Type**: logical_gap / unsupported_claim / missing_perspective / overreach / structural / clarity
- **Description**: What the issue is
- **Why it matters**: Impact on the output's credibility or usefulness
- **Suggestion**: How to address it

### Quality Ratings
- Strength of evidence (1-5):
- Reasoning quality (1-5):
- Completeness (1-5):
- Clarity (1-5):

### Recommended Improvements
Top 3 things to fix or add."""
        content = await self.llm.generate(prompt)
        return AgentOutput(
            content=content,
            findings=[{"type": "critique", "content": content}],
            metadata={"role": self.role},
        )
