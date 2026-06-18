from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class Citation(BaseModel):
    document_id: int
    page: int
    snippet: str


class ChatAsk(BaseModel):
    message: str
    document_id: int | None = None
    session_id: int | None = None


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    content: str
    citations: list[Citation] = []
    created_at: datetime


class ChatSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    document_id: int | None
    created_at: datetime


class ChatResponse(BaseModel):
    session_id: int
    answer: str
    citations: list[Citation] = []
