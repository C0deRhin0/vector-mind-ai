"""Document loader — extracts text from PDF, DOCX, TXT, MD files."""

from pathlib import Path
from pypdf import PdfReader
import docx

SUPPORTED = {".pdf", ".docx", ".txt", ".md"}


def load_document(path: Path) -> list[dict]:
    """
    Returns: [{"text": str, "page": int, "filename": str, "filepath": str}]
    Page is 1-indexed. DOCX/MD/TXT treated as single page.
    """
    ext = path.suffix.lower()
    if ext not in SUPPORTED:
        return []

    name = path.name
    fp = str(path)

    if ext == ".pdf":
        return _pdf(path, name, fp)
    elif ext == ".docx":
        return _docx(path, name, fp)
    else:
        return _txt(path, name, fp)


def _pdf(path, name, fp):
    reader = PdfReader(str(path))
    pages = []
    for i, page in enumerate(reader.pages):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append({"text": text, "page": i + 1, "filename": name, "filepath": fp})
    return pages


def _docx(path, name, fp):
    doc = docx.Document(str(path))
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    full_text = "\n\n".join(paragraphs)
    if not full_text:
        return []
    return [{"text": full_text, "page": 1, "filename": name, "filepath": fp}]


def _txt(path, name, fp):
    # Also handles .md files
    text = path.read_text(encoding="utf-8", errors="replace").strip()
    if not text:
        return []
    return [{"text": text, "page": 1, "filename": name, "filepath": fp}]
