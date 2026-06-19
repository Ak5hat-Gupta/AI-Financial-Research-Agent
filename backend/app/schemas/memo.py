from __future__ import annotations

from pydantic import BaseModel, Field


class MemoRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=16)


class MemoSection(BaseModel):
    title: str
    body: str


class MemoResponse(BaseModel):
    id: int | None = None
    ticker: str
    company: str
    rating: str            # Buy | Hold | Sell
    conviction: str        # High | Moderate | Low
    target_price: float | None
    current_price: float | None
    upside_pct: float | None
    health_score: float
    sentiment: str
    sections: list[MemoSection]
    created_at: str | None = None
