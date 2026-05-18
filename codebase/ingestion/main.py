#!/usr/bin/env python3
"""
Document ingestion CLI for Research OS.

Usage:
    python main.py --dir /path/to/documents
    python main.py --dir /path/to/documents --reset
    python main.py --file /path/to/single.pdf
"""

import argparse
import sys
from pathlib import Path

from loader import load_document
from chunker import chunk_pages
from embedder import embed
from qdrant_writer import ensure_collection, upsert_chunks, collection_stats
from ingestion_config import DOCS_DIR, QDRANT_URL, COLLECTION_NAME


def ingest_file(path: Path) -> dict:
    """Process a single file through the ingestion pipeline."""
    print(f"\n  Processing: {path.name}")
    pages = load_document(path)
    if not pages:
        print("  No text extracted. Skipping.")
        return {"file": path.name, "status": "skipped"}

    chunks = chunk_pages(pages)
    print(f"  → {len(pages)} pages, {len(chunks)} chunks")

    texts = [c["text"] for c in chunks]
    embeddings = embed(texts)

    upsert_chunks(chunks, embeddings)
    print(f"  Done: {path.name}")
    return {"file": path.name, "status": "ok", "chunks": len(chunks)}


def main(argv=None):
    parser = argparse.ArgumentParser(description="Research OS — ingestion pipeline")
    parser.add_argument("--dir", type=Path, default=DOCS_DIR, help="Directory of documents")
    parser.add_argument("--file", type=Path, help="Single file to ingest")
    parser.add_argument("--reset", action="store_true", help="Delete and recreate collection")
    args = parser.parse_args(argv)

    if args.reset:
        from qdrant_client import QdrantClient
        client = QdrantClient(url=QDRANT_URL)
        try:
            client.delete_collection(COLLECTION_NAME)
            print(f"Deleted collection '{COLLECTION_NAME}'")
        except Exception:
            pass

    ensure_collection()

    results = []
    if args.file:
        results.append(ingest_file(args.file))
    elif args.dir:
        files = [
            f for f in args.dir.rglob("*")
            if f.suffix.lower() in {".pdf", ".docx", ".txt", ".md"}
        ]
        if not files:
            print(f"No documents found in {args.dir}")
            sys.exit(1)
        print(f"\nFound {len(files)} document(s) in {args.dir}")
        for f in files:
            results.append(ingest_file(f))
    else:
        print("Provide --dir or --file")
        sys.exit(1)

    print("\n" + "=" * 40)
    print("INGESTION COMPLETE")
    ok = sum(1 for r in results if r["status"] == "ok")
    skipped = sum(1 for r in results if r["status"] == "skipped")
    total_chunks = sum(r.get("chunks", 0) for r in results)
    print(f"  Files:  {ok} ingested, {skipped} skipped")
    print(f"  Chunks: {total_chunks} total")
    stats = collection_stats()
    print(f"  Qdrant: {stats['total_vectors']} vectors in collection")
    print("=" * 40)


if __name__ == "__main__":
    main()
