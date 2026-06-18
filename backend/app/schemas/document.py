from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    ticker: str
    company: str
    doc_type: str
    page_count: int
    char_count: int
    status: str
    summary: str
    created_at: datetime


class DocumentSummaryOut(BaseModel):
    document_id: int
    summary: str
    highlights: list[str]
