"""
Ingestion Configuration — MUST match backend config.
"""

from pathlib import Path

# Paths
DOCS_DIR = Path(__file__).parent.parent.parent / "documents"
DOCS_DIR.mkdir(parents=True, exist_ok=True)

# Qdrant
QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "research_docs"
VECTOR_SIZE = 384

# Chunking
CHUNK_SIZE = 800
CHUNK_OVERLAP = 150

# Embedding model — MUST match codebase/backend/config.py
EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"

# Batch size
UPSERT_BATCH_SIZE = 64
