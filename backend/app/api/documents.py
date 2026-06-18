from __future__ import annotations

import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.document import Document, DocumentChunk
from app.models.user import User
from app.schemas.document import DocumentOut, DocumentSummaryOut
from app.services import pdf_parser
from app.services.embeddings import embed_texts
from app.services.rag import summarize_document

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=list[DocumentOut])
def list_documents(
    db: Session = Depends(get_db), current: User = Depends(get_current_user)
) -> list[DocumentOut]:
    docs = (
        db.execute(
            select(Document)
            .where(Document.owner_id == current.id)
            .order_by(Document.created_at.desc())
        )
        .scalars()
        .all()
    )
    return [DocumentOut.model_validate(d) for d in docs]


@router.post("", response_model=DocumentOut, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    ticker: str = Form(default=""),
    company: str = Form(default=""),
    doc_type: str = Form(default="10-K"),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> DocumentOut:
    data = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_upload_mb}MB limit.")

    name = (file.filename or "filing").lower()
    try:
        if name.endswith(".pdf"):
            parsed = pdf_parser.parse_pdf(data)
        else:
            parsed = pdf_parser.parse_text(data)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {exc}")

    doc = Document(
        owner_id=current.id,
        filename=file.filename or "filing",
        ticker=ticker.upper(),
        company=company,
        doc_type=doc_type,
        page_count=parsed.page_count,
        char_count=parsed.char_count,
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Chunk + embed.
    chunks = pdf_parser.chunk_pages(parsed.pages)
    if not chunks:
        doc.status = "failed"
        doc.summary = "No extractable text found in the document."
        db.commit()
        db.refresh(doc)
        return DocumentOut.model_validate(doc)

    embeddings = embed_texts([c.content for c in chunks])
    for ch, emb in zip(chunks, embeddings):
        db.add(
            DocumentChunk(
                document_id=doc.id,
                chunk_index=ch.index,
                page=ch.page,
                content=ch.content,
                embedding=json.dumps(emb),
            )
        )
    db.commit()

    # Auto-summary.
    try:
        summary, _ = summarize_document(db, doc)
        doc.summary = summary
    except Exception:
        doc.summary = ""
    doc.status = "ready"
    db.commit()
    db.refresh(doc)
    return DocumentOut.model_validate(doc)


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)
) -> DocumentOut:
    doc = _owned(db, document_id, current)
    return DocumentOut.model_validate(doc)


@router.get("/{document_id}/summary", response_model=DocumentSummaryOut)
def document_summary(
    document_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)
) -> DocumentSummaryOut:
    doc = _owned(db, document_id, current)
    summary, highlights = summarize_document(db, doc)
    doc.summary = summary
    db.commit()
    return DocumentSummaryOut(document_id=doc.id, summary=summary, highlights=highlights)


@router.delete("/{document_id}", status_code=204, response_class=Response)
def delete_document(
    document_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)
) -> Response:
    doc = _owned(db, document_id, current)
    db.delete(doc)
    db.commit()
    return Response(status_code=204)


def _owned(db: Session, document_id: int, current: User) -> Document:
    doc = db.get(Document, document_id)
    if not doc or doc.owner_id != current.id:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc
