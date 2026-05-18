"""Text chunker — splits documents into overlapping chunks."""

import hashlib
from langchain.text_splitter import RecursiveCharacterTextSplitter
from ingestion_config import CHUNK_SIZE, CHUNK_OVERLAP

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def chunk_pages(pages: list[dict]) -> list[dict]:
    """
    Input:  [{"text", "page", "filename", "filepath"}]
    Output: same fields + "chunk_id" (stable hash), "chunk_index"
    """
    chunks = []
    for page in pages:
        splits = _splitter.split_text(page["text"])
        for i, text in enumerate(splits):
            chunk_id = hashlib.md5(
                f"{page['filename']}::p{page['page']}::c{i}".encode()
            ).hexdigest()
            chunks.append({
                **page,
                "text": text,
                "chunk_index": i,
                "chunk_id": chunk_id,
            })
    return chunks
