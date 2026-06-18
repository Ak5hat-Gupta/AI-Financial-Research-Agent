from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentChunk
from app.repositories.base import BaseRepository


class DocumentRepository(BaseRepository[Document]):
    model = Document

    def __init__(self, db: Session) -> None:
        super().__init__(db)

    def list_for_owner(self, owner_id: int) -> list[Document]:
        return list(
            self.db.execute(
                select(Document)
                .where(Document.owner_id == owner_id)
                .order_by(Document.created_at.desc())
            ).scalars().all()
        )

    def get_owned(self, document_id: int, owner_id: int) -> Document | None:
        doc = self.db.get(Document, document_id)
        if doc and doc.owner_id == owner_id:
            return doc
        return None

    def add_chunks(self, chunks: list[DocumentChunk]) -> None:
        self.db.add_all(chunks)
        self.db.commit()
