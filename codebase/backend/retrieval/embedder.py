"""
Embedder — Generates embeddings for retrieval-augmented generation.

Must use the same model as the ingestion pipeline.
"""

from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def embed_query(query: str) -> list[float]:
    return get_model().encode([query])[0].tolist()


def embed_texts(texts: list[str]) -> list[list[float]]:
    return get_model().encode(texts, show_progress_bar=False).tolist()
