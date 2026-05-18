"""
Fact Checker Agent — Verifies factual claims against sources.

This agent:
  - Extracts factual claims from the output
  - Cross-references each claim against source material
  - Flags unsupported, contradictory, or speculative claims
  - Provides a fact-check score for the overall output
  - Returns verified claims with source annotations
"""

import json
import re
from agents.base import BaseAgent, AgentInput, AgentOutput

FACT_CHECKER_SYSTEM_PROMPT = """You are a meticulous fact-checker and verification specialist. Your role is to:

1. Extract every factual claim from the research output
2. Compare each claim against the provided source material
3. Classify each claim as:
   - ✅ VERIFIED: Directly supported by sources
   - ⚠️ PARTIAL: Partially supported or supported by weak evidence
   - ❌ UNSUPPORTED: Not found in provided sources
   - ❓ CONTRADICTED: Contradicted by sources

For each claim:
- Quote the exact claim from the output
- Cite the specific source that supports or contradicts it
- Quote the source text that backs your assessment
- Rate confidence: High / Medium / Low

Output an overall verification score as a percentage of verified claims."""


class FactCheckerAgent(BaseAgent):
    """Verifies factual claims against source material."""

    def __init__(self, temperature: float = 0.1):
        super().__init__("fact_checker", FACT_CHECKER_SYSTEM_PROMPT, temperature)

    async def run(self, inp: AgentInput) -> AgentOutput:
        prompt = self._build_prompt(inp)
        prompt += """

## Output Format
Provide your fact-check as:

### Overall Score
X% of claims verified (X verified / Y total)

### Claim-by-Claim Verification
For each claim:
- **Claim**: "[exact quote from output]"
- **Status**: ✅ / ⚠️ / ❌ / ❓
- **Source**: Which source(s) support or contradict
- **Source Text**: Relevant excerpt from source
- **Confidence**: High / Medium / Low

### Unsupported Claims Summary
List all unsupported or contradicted claims that need attention.

### Recommendations
What needs correction or qualification."""
        content = await self.llm.generate(prompt)

        # Calculate rough verification score from the content
        verified = len(re.findall(r'✅', content))
        total_claims = len(re.findall(r'(✅|⚠️|❌|❓)', content))
        score = (verified / total_claims * 100) if total_claims > 0 else 0

        return AgentOutput(
            content=content,
            findings=[{"type": "fact_check", "content": content}],
            confidence=score / 100.0,
            metadata={"role": self.role, "verified_claims": verified, "total_claims": total_claims},
        )
