from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.document import Document, DocumentChunk
from app.models.user import User
from app.services.earnings import analyze_transcript
from app.services.graph import build_graph

router = APIRouter(tags=["insights"])


@router.get("/graph")
def knowledge_graph(
    ticker: str = Query(...),
    depth: int = Query(default=1, ge=1, le=3),
    live: bool = Query(default=False),
    _: User = Depends(get_current_user),
) -> dict:
    return build_graph(ticker, depth=depth, live=live)


class EarningsRequest(BaseModel):
    text: str | None = None
    ticker: str = ""
    document_id: int | None = None


@router.post("/earnings/analyze")
def earnings_analyze(
    req: EarningsRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    text = req.text or ""
    if req.document_id:
        doc = db.get(Document, req.document_id)
        if not doc or doc.owner_id != current.id:
            raise HTTPException(status_code=404, detail="Document not found.")
        chunks = db.execute(
            select(DocumentChunk).where(DocumentChunk.document_id == doc.id).order_by(DocumentChunk.chunk_index)
        ).scalars().all()
        text = "\n".join(c.content for c in chunks)
        if not req.ticker:
            req.ticker = doc.ticker
    if len(text.strip()) < 40:
        raise HTTPException(status_code=400, detail="Provide transcript text or a processed document.")
    return analyze_transcript(text, req.ticker)
