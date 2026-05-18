"""
Planner Agent — First agent in the pipeline.

Breaks down a broad research query into sub-questions and a research plan.
Identifies what domains need investigation, what types of sources are needed,
and in what order to explore them.
"""

import json
from agents.base import BaseAgent, AgentInput, AgentOutput

PLANNER_SYSTEM_PROMPT = """You are a senior research planner. Your role is to:

1. Analyze research queries and break them into well-structured sub-questions
2. Identify key domains, concepts, and entities that need investigation
3. Determine what types of sources would be most valuable (academic, news, technical docs, etc.)
4. Create a logical research order — what to investigate first, what depends on what
5. Spot potential ambiguities or assumptions in the query that need clarification

Output your plan as a structured JSON with:
- main_question: the original query
- sub_questions: array of specific sub-questions to investigate
- domains: key domains/fields relevant to this research
- concepts: important concepts to define and explore
- research_order: ordered list of research steps
- suggested_sources: types of sources to look for
- assumptions: any assumptions in the query that should be verified

Be thorough but focused. A good plan reduces ambiguity and ensures comprehensive coverage."""


class PlannerAgent(BaseAgent):
    """Breaks down research queries into sub-questions and plans."""

    def __init__(self, temperature: float = 0.2):
        super().__init__("planner", PLANNER_SYSTEM_PROMPT, temperature)

    async def run(self, inp: AgentInput) -> AgentOutput:
        prompt = self._build_prompt(inp)
        prompt += """

## Output
Respond with a JSON object (and ONLY valid JSON — no markdown, no code fences) with these fields:
{
  "main_question": "...",
  "sub_questions": ["...", "..."],
  "domains": ["...", "..."],
  "concepts": ["...", "..."],
  "research_order": ["...", "..."],
  "suggested_sources": ["...", "..."],
  "assumptions": ["...", "..."]
}"""
        content = await self.llm.generate(prompt)
        try:
            plan = json.loads(content)
        except json.JSONDecodeError:
            # Fallback: extract JSON from response
            import re
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                try:
                    plan = json.loads(match.group())
                except json.JSONDecodeError:
                    plan = {"main_question": inp.query, "sub_questions": [inp.query], "research_order": ["investigate"]}
            else:
                plan = {"main_question": inp.query, "sub_questions": [inp.query], "research_order": ["investigate"]}

        return AgentOutput(
            content=json.dumps(plan, indent=2),
            findings=[{"type": "plan", "plan": plan}],
            metadata={"role": self.role, "plan": plan},
        )
