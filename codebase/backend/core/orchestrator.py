"""
Multi-Agent Research Orchestrator — The core of the system.

Coordinates up to 6 specialized agents in waves, just like the supervisor pattern:
  Wave 1 — Planner (design research plan)
  Wave 2 — Researcher (gather information)
  Wave 3 — Analyst (synthesize findings)
  Wave 4 — Writer (generate output)
  Wave 5 — Critic (review & challenge)
  Wave 6 — Fact Checker (verify claims)

Each agent runs sequentially, passing context to the next.
The orchestrator tracks state, manages agent lifecycle, and assembles the final result.
"""

import asyncio
import json
import time
import uuid
from typing import AsyncGenerator, Optional

from pydantic import BaseModel

from agents.base import AgentInput
from agents.planner import PlannerAgent
from agents.researcher import ResearcherAgent
from agents.analyst import AnalystAgent
from agents.writer import WriterAgent
from agents.critic import CriticAgent
from agents.fact_checker import FactCheckerAgent
from services.web_search import WebSearchService
from services.knowledge_graph import KnowledgeGraphService
from retrieval.retriever import retrieve_sources

from config import MAX_RESEARCH_DEPTH


class ResearchState(BaseModel):
    """Tracks the state of a research session."""
    session_id: str = ""
    query: str = ""
    status: str = "initialized"  # initialized → planning → researching → analyzing → writing → reviewing → fact_checking → completed
    plan: dict = {}
    research_findings: str = ""
    analysis: str = ""
    output: str = ""
    critique: str = ""
    fact_check: str = ""
    sources_used: list[dict] = []
    output_format: str = "research_brief"
    error: Optional[str] = None
    started_at: float = 0.0
    completed_at: float = 0.0
    agent_trace: list[dict] = []  # Full trace of agent activity for the UI


class Orchestrator:
    """Coordinates multi-agent research workflows."""

    def __init__(self):
        self.planner = PlannerAgent()
        self.researcher = ResearcherAgent()
        self.analyst = AnalystAgent()
        self.writer = WriterAgent()
        self.critic = CriticAgent()
        self.fact_checker = FactCheckerAgent()
        self.web_search = WebSearchService()
        self.knowledge_graph = KnowledgeGraphService()

    async def run_full_research(
        self,
        query: str,
        output_format: str = "research_brief",
        depth: int = 1,
        sources: Optional[list[dict]] = None,
        agent_instructions: Optional[dict[str, str]] = None,
    ) -> ResearchState:
        agent_instructions = agent_instructions or {}
        """
        Run the full multi-agent research pipeline.

        Depth controls how many refinement cycles to run:
          1 = single pass through all agents
          2 = writer → critic → writer refinement cycle
          3 = full depth with fact-check → writer refinement
        """
        state = ResearchState(
            session_id=str(uuid.uuid4())[:8],
            query=query,
            status="initialized",
            output_format=output_format,
            started_at=time.time(),
        )

        try:
            # ─── Wave 1: Plan ──────────────────────────────
            state.status = "planning"
            state.agent_trace.append({"agent": "planner", "status": "running", "timestamp": time.time()})

            # First, retrieve any relevant sources from the vector DB
            retrieved_sources = retrieve_sources(query) or []

            # Also try web search for broader context
            web_results = await self.web_search.search(query)
            all_sources = retrieved_sources + web_results

            plan_input = AgentInput(
                query=query,
                sources=all_sources[:20],
            )
            plan_result = await self.planner.run(plan_input)
            state.plan = plan_result.metadata.get("plan", {})
            state.sources_used = all_sources[:10]
            sub_questions = state.plan.get("sub_questions", [query])
            state.agent_trace.append({"agent": "planner", "status": "completed", "output_preview": plan_result.content[:200], "timestamp": time.time()})

            # ─── Wave 2: Research ──────────────────────────
            state.status = "researching"
            state.agent_trace.append({"agent": "researcher", "status": "running", "timestamp": time.time()})

            # Gather info for each sub-question
            all_findings = []
            for sq in sub_questions[:3]:  # Max 3 sub-questions for depth
                sq_sources = retrieve_sources(sq)
                sq_web = await self.web_search.search(sq)
                sq_all = sq_sources + sq_web

                research_input = AgentInput(
                    query=sq,
                    sources=sq_all[:15],
                    context=f"Main question: {query}\nSub-question: {sq}",
                )
                result = await self.researcher.run(research_input)
                all_findings.append(result.content)

                # Track findings in knowledge graph
                self.knowledge_graph.add_research_finding(query, sq, result.content, sq_all[:5])

            state.research_findings = "\n\n---\n\n".join(all_findings)
            state.agent_trace.append({"agent": "researcher", "status": "completed", "output_preview": state.research_findings[:200], "timestamp": time.time()})

            # ─── Wave 3: Analyze ───────────────────────────
            state.status = "analyzing"
            state.agent_trace.append({"agent": "analyst", "status": "running", "timestamp": time.time()})

            analysis_input = AgentInput(
                query=query,
                context=state.research_findings,
                sources=all_sources,
            )
            analysis_result = await self.analyst.run(analysis_input)
            state.analysis = analysis_result.content
            self.knowledge_graph.add_analysis(query, state.analysis)
            state.agent_trace.append({"agent": "analyst", "status": "completed", "output_preview": state.analysis[:200], "timestamp": time.time()})

            # ─── Wave 4: Write ─────────────────────────────
            state.status = "writing"
            state.agent_trace.append({"agent": "writer", "status": "running", "timestamp": time.time()})

            write_input = AgentInput(
                query=query,
                context=state.analysis,
                sources=all_sources,
                parameters={"output_format": output_format},
            )
            write_result = await self.writer.run(write_input)
            state.output = write_result.content
            state.agent_trace.append({"agent": "writer", "status": "completed", "output_preview": state.output[:200], "timestamp": time.time()})

            # ─── Depth 2+: Critique + Refine ──────────────
            if depth >= 2:
                state.status = "reviewing"
                state.agent_trace.append({"agent": "critic", "status": "running", "timestamp": time.time()})

                critic_input = AgentInput(
                    query=query,
                    context=state.analysis,
                    instructions=f"Review this {output_format}:\n\n{state.output}",
                    sources=all_sources,
                )
                critic_result = await self.critic.run(critic_input)
                state.critique = critic_result.content
                state.agent_trace.append({"agent": "critic", "status": "completed", "output_preview": state.critique[:200], "timestamp": time.time()})

                # Refine: writer revises based on critique
                if depth >= 2:
                    state.agent_trace.append({"agent": "writer", "status": "running (revision)", "timestamp": time.time()})
                    revise_input = AgentInput(
                        query=query,
                        context=state.analysis,
                        instructions=f"Revise this {output_format} based on this review:\n\n{state.critique}\n\nOriginal output:\n{state.output}",
                        sources=all_sources,
                        parameters={"output_format": output_format},
                    )
                    revised = await self.writer.run(revise_input)
                    state.output = revised.content
                    state.agent_trace.append({"agent": "writer", "status": "completed (revision)", "output_preview": state.output[:200], "timestamp": time.time()})

            # ─── Depth 3+: Fact Check ──────────────────────
            if depth >= 3:
                state.status = "fact_checking"
                state.agent_trace.append({"agent": "fact_checker", "status": "running", "timestamp": time.time()})

                fc_input = AgentInput(
                    query=query,
                    instructions=f"Fact-check this {output_format}:\n\n{state.output}",
                    sources=all_sources,
                )
                fc_result = await self.fact_checker.run(fc_input)
                state.fact_check = fc_result.content
                state.agent_trace.append({"agent": "fact_checker", "status": "completed", "confidence": fc_result.confidence, "timestamp": time.time()})

            state.status = "completed"
            state.completed_at = time.time()

            # Finalize knowledge graph
            self.knowledge_graph.finalize_session(state.session_id, query, state.output)

        except Exception as e:
            state.status = "error"
            state.error = str(e)
            state.agent_trace.append({"agent": "orchestrator", "status": "error", "error": str(e), "timestamp": time.time()})

        return state

    async def stream_research(
        self,
        query: str,
        output_format: str = "research_brief",
        depth: int = 1,
        agent_instructions: Optional[dict[str, str]] = None,
    ) -> AsyncGenerator[dict, None]:
        """
        Stream research progress events for real-time UI updates.
        Yields dicts with type: status, agent_start, agent_complete, token, error, done
        agent_instructions: optional dict of custom instructions per agent key
        """
        agent_instructions = agent_instructions or {}
        state = ResearchState(
            session_id=str(uuid.uuid4())[:8],
            query=query,
            status="initialized",
            output_format=output_format,
            started_at=time.time(),
        )

        try:
            # Phase 1: Sources
            yield {"type": "status", "message": "🔍 Gathering sources...", "agent": "system"}
            retrieved_sources = retrieve_sources(query) or []
            web_results = await self.web_search.search(query)
            all_sources = retrieved_sources + web_results
            state.sources_used = all_sources[:10]
            yield {"type": "status", "message": f"Found {len(all_sources)} relevant sources", "agent": "system"}

            # Phase 2: Plan
            yield {"type": "agent_start", "agent": "planner", "label": "Planning research strategy"}
            state.status = "planning"
            plan_instructions = agent_instructions.get("planner", "")
            plan_input = AgentInput(query=query, sources=all_sources[:20], instructions=plan_instructions)
            plan_result = await self.planner.run(plan_input)
            state.plan = plan_result.metadata.get("plan", {})
            sub_questions = state.plan.get("sub_questions", [query])
            yield {"type": "agent_complete", "agent": "planner", "plan": state.plan}
            state.agent_trace.append({"agent": "planner", "status": "completed", "timestamp": time.time()})

            # Phase 3: Research
            yield {"type": "agent_start", "agent": "researcher", "label": "Researching sub-topics"}
            state.status = "researching"
            all_findings = []
            for sq in sub_questions[:3]:
                yield {"type": "status", "message": f"  Investigating: {sq[:80]}...", "agent": "researcher"}
                sq_sources = retrieve_sources(sq)
                sq_web = await self.web_search.search(sq)
                sq_all = sq_sources + sq_web
                research_input = AgentInput(query=sq, sources=sq_all[:15], context=f"Main: {query}", instructions=agent_instructions.get("researcher", ""))
                result = await self.researcher.run(research_input)
                all_findings.append(result.content)
                self.knowledge_graph.add_research_finding(query, sq, result.content, sq_all[:5])

            state.research_findings = "\n\n---\n\n".join(all_findings)
            yield {"type": "agent_complete", "agent": "researcher"}
            state.agent_trace.append({"agent": "researcher", "status": "completed", "timestamp": time.time()})

            # Phase 4: Analyze
            yield {"type": "agent_start", "agent": "analyst", "label": "Analyzing and synthesizing findings"}
            state.status = "analyzing"
            analysis_input = AgentInput(query=query, context=state.research_findings, sources=all_sources, instructions=agent_instructions.get("analyst", ""))
            analysis_result = await self.analyst.run(analysis_input)
            state.analysis = analysis_result.content
            self.knowledge_graph.add_analysis(query, state.analysis)
            yield {"type": "agent_complete", "agent": "analyst"}
            state.agent_trace.append({"agent": "analyst", "status": "completed", "timestamp": time.time()})

            # Phase 5: Write
            yield {"type": "agent_start", "agent": "writer", "label": f"Writing {output_format.replace('_', ' ')}"}
            state.status = "writing"
            write_input = AgentInput(query=query, context=state.analysis, sources=all_sources, parameters={"output_format": output_format}, instructions=agent_instructions.get("writer", ""))
            async for token in self.writer.stream(write_input):
                yield {"type": "token", "text": token}
            # Also get the full output
            write_result = await self.writer.run(write_input)
            state.output = write_result.content
            yield {"type": "agent_complete", "agent": "writer"}
            state.agent_trace.append({"agent": "writer", "status": "completed", "timestamp": time.time()})

            # Phase 6: Critique (depth >= 2)
            if depth >= 2:
                yield {"type": "agent_start", "agent": "critic", "label": "Reviewing for quality and gaps"}
                state.status = "reviewing"
                critic_instructions = agent_instructions.get("critic", "")
                critic_input = AgentInput(query=query, context=state.analysis, instructions=f"{critic_instructions}\nReview this {output_format}:\n\n{state.output}".strip(), sources=all_sources)
                critic_result = await self.critic.run(critic_input)
                state.critique = critic_result.content
                yield {"type": "agent_complete", "agent": "critic"}
                state.agent_trace.append({"agent": "critic", "status": "completed", "timestamp": time.time()})

                # Refine
                yield {"type": "agent_start", "agent": "writer", "label": "Refining based on review"}
                revise_input = AgentInput(query=query, context=state.analysis, instructions=f"{agent_instructions.get('writer', '')}\nRevise based on:\n{state.critique}\n\nOriginal:\n{state.output}".strip(), sources=all_sources, parameters={"output_format": output_format})
                revised = await self.writer.run(revise_input)
                state.output = revised.content
                yield {"type": "agent_complete", "agent": "writer"}
                state.agent_trace.append({"agent": "writer (revised)", "status": "completed", "timestamp": time.time()})

            # Phase 7: Fact Check (depth >= 3)
            if depth >= 3:
                yield {"type": "agent_start", "agent": "fact_checker", "label": "Verifying factual claims"}
                state.status = "fact_checking"
                fc_input = AgentInput(query=query, instructions=f"{agent_instructions.get('fact_checker', '')}\nFact-check:\n\n{state.output}".strip(), sources=all_sources)
                fc_result = await self.fact_checker.run(fc_input)
                state.fact_check = fc_result.content
                yield {"type": "agent_complete", "agent": "fact_checker", "confidence": fc_result.confidence}
                state.agent_trace.append({"agent": "fact_checker", "status": "completed", "timestamp": time.time()})

            state.status = "completed"
            state.completed_at = time.time()
            self.knowledge_graph.finalize_session(state.session_id, query, state.output)

            yield {"type": "done", "state": state.model_dump()}

        except Exception as e:
            state.status = "error"
            state.error = str(e)
            yield {"type": "error", "message": str(e)}
