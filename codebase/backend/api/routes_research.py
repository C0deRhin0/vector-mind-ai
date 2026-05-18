"""
Research API Routes — All endpoints for the research platform.

Endpoints:
  POST /api/research           — Full research (non-streaming)
  GET  /api/research/stream    — SSE streaming research
  POST /api/research/quick     — Quick Q&A (single-agent, faster)
  GET  /api/research/history   — Past research sessions
  GET  /api/knowledge/graph    — Knowledge graph data
  GET  /api/knowledge/stats    — Knowledge graph statistics
  GET  /api/diagnostics        — System health check
"""

import json
import time
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from core.orchestrator import Orchestrator
from services.knowledge_graph import KnowledgeGraphService
from retrieval.retriever import retrieve_sources
from config import COLLECTION_NAME, QDRANT_URL

router = APIRouter(prefix="/api")
orchestrator = Orchestrator()
knowledge_graph = KnowledgeGraphService()


# ─── Request / Response Models ──────────────────────────

class ResearchRequest(BaseModel):
    question: str
    output_format: str = "research_brief"
    depth: int = 1  # 1=basic, 2=with critique, 3=with fact-check


class QuickAskRequest(BaseModel):
    question: str


class ResearchSession(BaseModel):
    session_id: str
    query: str
    status: str
    output: Optional[str] = None
    sources: list[dict] = []
    agent_trace: list[dict] = []
    created_at: float = 0.0


# ─── In-memory session store ────────────────────────────
_sessions: dict[str, dict] = {}


# ─── Routes ─────────────────────────────────────────────

@router.post("/research")
async def run_research(req: ResearchRequest):
    """
    Run full multi-agent research pipeline.
    Returns the complete ResearchState when done.
    """
    state = await orchestrator.run_full_research(
        query=req.question,
        output_format=req.output_format,
        depth=min(req.depth, 3),
    )

    # Store session
    _sessions[state.session_id] = {
        "session_id": state.session_id,
        "query": state.query,
        "status": state.status,
        "output": state.output,
        "sources": state.sources_used,
        "agent_trace": state.agent_trace,
        "created_at": state.started_at,
        "error": state.error,
    }

    if state.status == "error":
        raise HTTPException(status_code=500, detail=state.error)

    return {
        "session_id": state.session_id,
        "status": state.status,
        "query": state.query,
        "output": state.output,
        "plan": state.plan,
        "analysis": state.analysis,
        "critique": state.critique,
        "fact_check": state.fact_check,
        "sources": state.sources_used,
        "agent_trace": state.agent_trace,
        "duration": round(state.completed_at - state.started_at, 1),
    }


@router.get("/research/stream")
async def stream_research(
    question: str = Query(..., description="Research question"),
    output_format: str = Query("research_brief", description="Output format"),
    depth: int = Query(1, description="Research depth (1-3)"),
):
    """
    SSE stream for real-time research progress.
    Events:
      {"type": "status", "message": "...", "agent": "..."}
      {"type": "agent_start", "agent": "...", "label": "..."}
      {"type": "agent_complete", "agent": "...", ...}
      {"type": "token", "text": "..."}
      {"type": "done", "state": {...}}
      {"type": "error", "message": "..."}
    """
    async def event_stream():
        async for event in orchestrator.stream_research(
            query=question,
            output_format=output_format,
            depth=min(depth, 3),
        ):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/research/quick")
async def quick_ask(req: QuickAskRequest):
    """
    Quick Q&A — single-agent mode for simple questions.
    Faster than full research, no multi-agent orchestration.
    """
    from agents.base import AgentInput
    from agents.researcher import ResearcherAgent

    sources = retrieve_sources(req.question)
    agent = ResearcherAgent(temperature=0.2)

    inp = AgentInput(
        query=req.question,
        sources=sources[:10],
        instructions="Answer the question concisely based on the provided sources. If you don't have enough information, say so.",
    )

    result = await agent.run(inp)

    return {
        "answer": result.content,
        "sources": sources[:5],
        "mode": "quick",
    }


@router.get("/research/history")
async def get_history(limit: int = Query(20, description="Max sessions to return")):
    """Return recent research sessions."""
    sessions = sorted(
        _sessions.values(),
        key=lambda s: s.get("created_at", 0),
        reverse=True,
    )[:limit]
    return {"sessions": sessions, "total": len(_sessions)}


@router.get("/knowledge/graph")
async def get_knowledge_graph():
    """Get knowledge graph data for visualization."""
    return knowledge_graph.get_graph_data()


@router.get("/knowledge/stats")
async def get_knowledge_stats():
    """Get knowledge graph statistics."""
    return knowledge_graph.get_stats()


@router.get("/diagnostics")
async def diagnostics():
    """Check system health — Qdrant, LLM provider, collection status."""
    results = {"qdrant": False, "llm": False, "collection": False}

    # Check Qdrant
    try:
        from qdrant_client import QdrantClient
        client = QdrantClient(url=QDRANT_URL, timeout=5)
        client.get_collections()
        results["qdrant"] = True

        collections = [c.name for c in client.get_collections().collections]
        results["collection"] = COLLECTION_NAME in collections
        if results["collection"]:
            info = client.get_collection(COLLECTION_NAME)
            results["vector_count"] = info.vectors_count
    except Exception as e:
        results["qdrant_error"] = str(e)

    # Check LLM
    try:
        from core.llm import create_llm
        llm = create_llm("Respond with just: OK")
        response = await llm.generate("Say OK")
        results["llm"] = True
        results["llm_response"] = response[:50]
    except Exception as e:
        results["llm_error"] = str(e)

    return results
