"""
Retriever — Hybrid search over the vector database.

Uses Qdrant's native dense + sparse fusion (RRF) for accurate retrieval.
"""

import hashlib
from collections import Counter

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Prefetch,
    FusionQuery,
    Fusion,
)

from config import QDRANT_URL, COLLECTION_NAME, TOP_K, SCORE_THRESHOLD
from retrieval.embedder import embed_query

_client: QdrantClient | None = None


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=QDRANT_URL, timeout=20)
    return _client


def _sparse_from_query(query: str):
    """Build a sparse vector from query tokens using TF-based weighting."""
    from qdrant_client.models import SparseVector

    tokens = query.lower().split()
    counts = Counter(tokens)
    total = sum(counts.values())
    indices, values = [], []
    for token, count in counts.items():
        idx = int(hashlib.md5(token.encode()).hexdigest(), 16) % (2 ** 20)
        indices.append(idx)
        values.append(count / total)
    return SparseVector(indices=indices, values=values)


def retrieve_sources(question: str) -> list[dict]:
    """
    Hybrid search via Qdrant native RRF fusion.
    Returns list of source dicts with text, filename, page, score.
    Returns empty list if collection doesn't exist or search fails.
    """
    client = get_client()

    # Check if collection exists
    try:
        collections = [c.name for c in client.get_collections().collections]
        if COLLECTION_NAME not in collections:
            return []
    except Exception:
        return []

    try:
        dense_vec = embed_query(question)
        sparse_vec = _sparse_from_query(question)

        results = client.query_points(
            collection_name=COLLECTION_NAME,
            prefetch=[
                Prefetch(query=dense_vec, using="dense", limit=TOP_K * 2),
                Prefetch(query=sparse_vec, using="sparse", limit=TOP_K * 2),
            ],
            query=FusionQuery(fusion=Fusion.RRF),
            limit=TOP_K,
            with_payload=True,
        )

        chunks = []
        for point in results.points:
            score = round(point.score, 4)
            if score < SCORE_THRESHOLD:
                continue
            payload = point.payload
            chunks.append({
                "text": payload.get("text", ""),
                "filename": payload.get("filename", "unknown"),
                "page": payload.get("page", 1),
                "score": score,
                "confidence": min(100, round(score * 100 / 0.05)),
                "source_type": "document",
            })

        return chunks

    except Exception:
        return []
