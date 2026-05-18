"""
Admin API Routes — Document management and system administration.

Endpoints:
  POST /api/admin/upload      — Upload documents for indexing
  GET  /api/admin/documents   — List all indexed documents
  DELETE /api/admin/documents/{filename} — Delete a document
  POST /api/admin/reindex     — Re-index all documents
  POST /api/admin/reset       — Wipe collection and re-index
  GET  /api/admin/collections — List Qdrant collections
"""

import os
import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from config import QDRANT_URL, COLLECTION_NAME, VECTOR_SIZE, EMBEDDING_MODEL

router = APIRouter(prefix="/api/admin")

# Simple admin code from env
ADMIN_CODE = os.getenv("ADMIN_CODE", "research-admin-2026")
DOCS_DIR = Path(os.getenv("DOCS_DIR", "./documents"))
DOCS_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "50"))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}


class AdminLogin(BaseModel):
    code: str


class DocumentInfo(BaseModel):
    filename: str
    size: int
    uploaded_at: str


# ─── Auth helper ────────────────────────────────────────

def verify_admin(code: str):
    if code != ADMIN_CODE:
        raise HTTPException(status_code=401, detail="Invalid admin code")


# ─── Routes ─────────────────────────────────────────────

@router.post("/login")
async def login(req: AdminLogin):
    """Verify admin code."""
    if req.code == ADMIN_CODE:
        return {"authenticated": True}
    raise HTTPException(status_code=401, detail="Invalid admin code")


@router.get("/documents")
async def list_documents(code: str = ""):
    """List all ingested documents (unique filenames from Qdrant)."""
    verify_admin(code)
    try:
        from qdrant_client import QdrantClient
        client = QdrantClient(url=QDRANT_URL, timeout=10)
        collections = [c.name for c in client.get_collections().collections]
        if COLLECTION_NAME not in collections:
            return {"documents": []}

        # Scroll through collection to get unique filenames
        scroll = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=1000,
            with_payload=["filename", "filepath"],
        )
        seen = {}
        for point in scroll[0]:
            fn = point.payload.get("filename", "unknown")
            if fn not in seen:
                seen[fn] = {
                    "filename": fn,
                    "filepath": point.payload.get("filepath", ""),
                    "chunks": 0,
                }
            seen[fn]["chunks"] += 1

        return {"documents": list(seen.values())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_document(
    code: str = Form(...),
    file: UploadFile = File(...),
):
    """Upload a document for ingestion."""
    verify_admin(code)

    ext = Path(file.filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail=f"File exceeds {MAX_FILE_SIZE_MB}MB limit")

    # Save file
    dest = DOCS_DIR / file.filename
    with open(dest, "wb") as f:
        f.write(contents)

    # Trigger ingestion
    try:
        from ingestion.main import ingest_file
        result = ingest_file(dest)
        return {"status": "ok", "file": file.filename, "chunks": result.get("chunks", 0)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")


@router.delete("/documents/{filename}")
async def delete_document(filename: str, code: str = ""):
    """Delete a document from the vector store."""
    verify_admin(code)
    try:
        from qdrant_client import QdrantClient, models
        client = QdrantClient(url=QDRANT_URL, timeout=10)
        result = client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="filename",
                            match=models.MatchValue(value=filename),
                        )
                    ]
                )
            ),
        )
        return {"status": "deleted", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reindex")
async def reindex(code: str = ""):
    """Re-index all documents from the docs directory."""
    verify_admin(code)
    try:
        from ingestion.main import main as ingest_main
        import sys
        # Run ingestion
        docs_path = str(DOCS_DIR)
        result = ingest_main(["--dir", docs_path])
        return {"status": "ok", "message": "Re-indexing complete"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset")
async def reset_collection(code: str = ""):
    """Delete and recreate the collection."""
    verify_admin(code)
    try:
        from qdrant_client import QdrantClient
        from qdrant_client.models import Distance, VectorParams, SparseVectorParams, SparseIndexParams
        client = QdrantClient(url=QDRANT_URL, timeout=10)

        # Delete if exists
        collections = [c.name for c in client.get_collections().collections]
        if COLLECTION_NAME in collections:
            client.delete_collection(COLLECTION_NAME)

        # Recreate
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config={
                "dense": VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
            },
            sparse_vectors_config={
                "sparse": SparseVectorParams(index=SparseIndexParams(on_disk=False)),
            },
        )
        return {"status": "ok", "message": "Collection reset and recreated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/collections")
async def list_collections():
    """List all Qdrant collections."""
    try:
        from qdrant_client import QdrantClient
        client = QdrantClient(url=QDRANT_URL, timeout=5)
        collections = client.get_collections().collections
        return {
            "collections": [
                {
                    "name": c.name,
                    "vectors": c.vectors_count if hasattr(c, 'vectors_count') else None,
                    "status": c.status,
                }
                for c in collections
            ]
        }
    except Exception as e:
        return {"collections": [], "error": str(e)}
