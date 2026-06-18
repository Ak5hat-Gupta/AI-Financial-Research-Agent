"""Extract text from uploaded filings and split into overlapping chunks."""
from __future__ import annotations

import io
import re
from dataclasses import dataclass

CHUNK_SIZE = 1100      # characters
CHUNK_OVERLAP = 180


@dataclass
class ParsedDoc:
    pages: list[str]
    page_count: int
    char_count: int


@dataclass
class Chunk:
    index: int
    page: int
    content: str


def parse_pdf(data: bytes) -> ParsedDoc:
    """Extract per-page text from a PDF byte stream."""
    try:
        from pypdf import PdfReader
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("pypdf is required to parse PDFs") from exc

    reader = PdfReader(io.BytesIO(data))
    pages: list[str] = []
    for page in reader.pages:
        try:
            pages.append((page.extract_text() or "").strip())
        except Exception:
            pages.append("")
    char_count = sum(len(p) for p in pages)
    return ParsedDoc(pages=pages, page_count=len(pages), char_count=char_count)


def parse_text(data: bytes) -> ParsedDoc:
    """Parse a plain-text / HTML-stripped filing into pseudo-pages."""
    text = data.decode("utf-8", errors="ignore")
    text = re.sub(r"<[^>]+>", " ", text)  # strip basic HTML
    # ~3000 chars per pseudo-page
    pages = [text[i : i + 3000].strip() for i in range(0, len(text), 3000)] or [""]
    return ParsedDoc(pages=pages, page_count=len(pages), char_count=len(text))


def _clean(text: str) -> str:
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_pages(pages: list[str]) -> list[Chunk]:
    """Split pages into overlapping character windows, tracking page numbers."""
    chunks: list[Chunk] = []
    idx = 0
    for page_no, raw in enumerate(pages, start=1):
        page = _clean(raw)
        if not page:
            continue
        start = 0
        while start < len(page):
            end = min(start + CHUNK_SIZE, len(page))
            content = page[start:end].strip()
            if len(content) > 60:  # skip tiny fragments
                chunks.append(Chunk(index=idx, page=page_no, content=content))
                idx += 1
            if end >= len(page):
                break
            start = end - CHUNK_OVERLAP
    return chunks
