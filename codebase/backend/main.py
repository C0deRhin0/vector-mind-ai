"""
vector-mind-ai — FastAPI Server Entry Point
Multi-agent research orchestration platform.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes_research import router as research_router
from api.routes_admin import router as admin_router

app = FastAPI(
    title="vector-mind-ai",
    version="1.0.0",
    description="Multi-agent research orchestration with grounded RAG",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(research_router)
app.include_router(admin_router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
