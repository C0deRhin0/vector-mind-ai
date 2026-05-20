"""
vector-mind-ai — Backend Configuration
Loads from environment variables with sensible defaults.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ─── LLM Provider ───────────────────────────────────────
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama")

# Ollama (local)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

# OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

# Anthropic
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

# Google
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GOOGLE_MODEL = os.getenv("GOOGLE_MODEL", "gemini-2.5-flash")

# ─── Vector Database ────────────────────────────────────
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "research_docs")

# ─── Embeddings ─────────────────────────────────────────
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
VECTOR_SIZE = int(os.getenv("VECTOR_SIZE", "384"))

# ─── Web Search ─────────────────────────────────────────
EXA_API_KEY = os.getenv("EXA_API_KEY", "")
FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY", "")

# ─── Research Config ────────────────────────────────────
MAX_RESEARCH_DEPTH = int(os.getenv("MAX_RESEARCH_DEPTH", "3"))
TOP_K = int(os.getenv("TOP_K", "10"))
SCORE_THRESHOLD = float(os.getenv("SCORE_THRESHOLD", "0.2"))
