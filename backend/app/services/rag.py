"""Retrieval-augmented Q&A over uploaded filings."""
from __future__ import annotations

import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentChunk
from app.services.embeddings import cosine_similarity, embed_text
from app.services.llm import get_llm

SYSTEM_PROMPT = (
    "You are a meticulous equity research analyst. Answer ONLY from the provided "
    "filing excerpts. Cite page numbers in square brackets like [p.12]. If the "
    "answer is not in the context, say so plainly. Be concise, quantitative, and "
    "neutral."
)


def retrieve(
    db: Session, owner_id: int, query: str, document_id: int | None = None, k: int = 6
) -> list[tuple[DocumentChunk, float]]:
    """Return the top-k most relevant chunks for a query."""
    q_emb = embed_text(query)

    stmt = (
        select(DocumentChunk)
        .join(Document, Document.id == DocumentChunk.document_id)
        .where(Document.owner_id == owner_id)
    )
    if document_id is not None:
        stmt = stmt.where(DocumentChunk.document_id == document_id)

    chunks = db.execute(stmt).scalars().all()
    scored: list[tuple[DocumentChunk, float]] = []
    for ch in chunks:
        try:
            emb = json.loads(ch.embedding) if ch.embedding else []
        except json.JSONDecodeError:
            emb = []
        scored.append((ch, cosine_similarity(q_emb, emb)))
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:k]


def answer_question(
    db: Session, owner_id: int, query: str, document_id: int | None = None
) -> tuple[str, list[dict]]:
    """Retrieve context, run the LLM, and return (answer, citations)."""
    top = retrieve(db, owner_id, query, document_id=document_id)
    if not top:
        return (
            "I couldn't find any indexed filing content to answer that. "
            "Upload a 10-K or annual report first, then ask again.",
            [],
        )

    context_blocks = []
    citations: list[dict] = []
    for ch, score in top:
        if score <= 0:
            continue
        context_blocks.append(f"[p.{ch.page}] {ch.content}")
        citations.append(
            {
                "document_id": ch.document_id,
                "page": ch.page,
                "snippet": ch.content[:240].strip(),
            }
        )

    context = "\n\n---\n\n".join(context_blocks) or "(no relevant context found)"
    prompt = (
        f"Filing excerpts:\n\n{context}\n\n"
        f"Question: {query}\n\n"
        "Answer with citations:"
    )
    answer = get_llm().complete(SYSTEM_PROMPT, prompt, max_tokens=900)
    return answer, citations[:4]


def summarize_document(db: Session, document: Document) -> tuple[str, list[str]]:
    """Generate an executive summary + highlights from the first chunks."""
    chunks = (
        db.execute(
            select(DocumentChunk)
            .where(DocumentChunk.document_id == document.id)
            .order_by(DocumentChunk.chunk_index)
            .limit(12)
        )
        .scalars()
        .all()
    )
    context = "\n\n".join(c.content for c in chunks)[:8000]
    system = (
        "You are an equity analyst. Produce a tight executive summary of this filing "
        "covering business model, revenue drivers, profitability, risks and outlook."
    )
    prompt = (
        f"Company: {document.company or document.ticker or document.filename}\n"
        f"Filing type: {document.doc_type}\n\nExcerpts:\n{context}\n\n"
        "Write a 4-6 sentence executive summary, then list 5 key highlights as bullet points."
    )
    text = get_llm().complete(system, prompt, max_tokens=700)

    # Split summary vs bullet highlights heuristically.
    highlights = [
        line.lstrip("-•* ").strip()
        for line in text.splitlines()
        if line.strip().startswith(("-", "•", "*"))
    ]
    summary = "\n".join(
        line for line in text.splitlines() if not line.strip().startswith(("-", "•", "*"))
    ).strip()
    if not highlights:
        highlights = [
            "Review revenue concentration and segment mix.",
            "Track gross and operating margin trajectory.",
            "Assess balance-sheet leverage and liquidity.",
            "Read MD&A for forward guidance.",
            "Note key risk factors and litigation.",
        ]
    return summary or text, highlights[:6]
