"""
Writer Agent — Generates polished output in various formats.

Supported formats:
  - research_brief: Concise executive summary
  - blog_post: Long-form article
  - twitter_thread: Thread of connected tweets
  - presentation: Slide outline
  - podcast_script: Script for audio content
  - executive_summary: One-page brief for decision makers
"""

import json
from agents.base import BaseAgent, AgentInput, AgentOutput

WRITER_SYSTEM_PROMPT = """You are a versatile writer who adapts content to different formats and audiences. Your role is to:

1. Transform research findings into polished, engaging content
2. Adapt tone, depth, and structure to the target format
3. Maintain accuracy while making content accessible
4. Properly cite sources and attribute claims
5. Structure content for maximum impact and readability

Format guidelines:
- research_brief: 300-500 words, structured with sections, cites sources in [brackets]
- blog_post: 800-1500 words, engaging intro, clear sections, compelling conclusion
- twitter_thread: 10-20 tweets (each 200-280 chars), numbered, with hooks
- presentation: 5-10 slides with title, key points, and speaker notes per slide
- podcast_script: Conversational tone, host+guest format, timing cues
- executive_summary: 200-300 words, bullet-point key findings and recommendations

Always prioritize accuracy over flair. The content must be grounded in the research."""


class WriterAgent(BaseAgent):
    """Generates polished output in various formats."""

    def __init__(self, temperature: float = 0.4):
        super().__init__("writer", WRITER_SYSTEM_PROMPT, temperature)

    async def run(self, inp: AgentInput) -> AgentOutput:
        output_format = inp.parameters.get("output_format", "research_brief")
        prompt = self._build_prompt(inp)
        prompt += f"""

## Output Format
Generate a {output_format.replace('_', ' ')} based on the research analysis above.

Make it polished, well-structured, and ready for its intended audience.
Use proper citations (source name, page) for all factual claims."""
        content = await self.llm.generate(prompt)
        return AgentOutput(
            content=content,
            findings=[{"type": "written_output", "format": output_format, "content": content}],
            metadata={"role": self.role, "output_format": output_format},
        )
