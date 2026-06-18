from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.analysis import SavedAnalysis
from app.models.user import User
from app.schemas.finance import (
    CompetitorRequest,
    CompetitorResponse,
    DCFRequest,
    DCFResponse,
    RatioRequest,
    RatioResponse,
    SentimentRequest,
    SentimentResponse,
)
from app.services import competitors, news
from app.services.market_data import get_fundamentals, list_known_tickers
from app.services.ratios import compute_ratios
from app.services.valuation import run_dcf, sensitivity_grid

router = APIRouter(tags=["finance"])


# ---------------- Market data ----------------
@router.get("/market/tickers")
def known_tickers() -> dict:
    return {"tickers": list_known_tickers()}


@router.get("/market/{ticker}")
def market_snapshot(ticker: str, live: bool = Query(default=True)) -> dict:
    return get_fundamentals(ticker, live=live)


# ---------------- DCF valuation ----------------
@router.post("/valuation/dcf", response_model=DCFResponse)
def dcf(
    req: DCFRequest,
    live: bool = Query(default=True),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> DCFResponse:
    # Auto-populate missing inputs from fundamentals.
    if req.ticker and (req.base_fcf is None or req.shares_outstanding is None):
        f = get_fundamentals(req.ticker, live=live)
        req = req.model_copy(
            update={
                "company": req.company or f.get("company", ""),
                "base_fcf": req.base_fcf if req.base_fcf is not None else f.get("fcf"),
                "shares_outstanding": req.shares_outstanding or f.get("shares_outstanding"),
                "net_debt": req.net_debt if req.net_debt is not None else f.get("net_debt", 0),
                "current_price": req.current_price or f.get("price"),
            }
        )
    result = run_dcf(req)
    _save(db, current, "dcf", result.ticker, f"DCF — {result.company}", result.model_dump())
    return result


@router.post("/valuation/dcf/sensitivity")
def dcf_sensitivity(
    req: DCFRequest,
    live: bool = Query(default=True),
    current: User = Depends(get_current_user),
) -> dict:
    if req.ticker and (req.base_fcf is None or req.shares_outstanding is None):
        f = get_fundamentals(req.ticker, live=live)
        req = req.model_copy(
            update={
                "base_fcf": req.base_fcf if req.base_fcf is not None else f.get("fcf"),
                "shares_outstanding": req.shares_outstanding or f.get("shares_outstanding"),
                "net_debt": req.net_debt if req.net_debt is not None else f.get("net_debt", 0),
                "current_price": req.current_price or f.get("price"),
            }
        )
    return sensitivity_grid(req)


# ---------------- Ratio analysis ----------------
@router.post("/ratios", response_model=RatioResponse)
def ratios(
    req: RatioRequest,
    live: bool = Query(default=True),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> RatioResponse:
    f = req.financials or get_fundamentals(req.ticker, live=live)
    company = f.get("company", req.ticker)
    result = compute_ratios(req.ticker, company, f)
    _save(db, current, "ratios", result.ticker, f"Ratios — {company}", result.model_dump())
    return result


# ---------------- Competitor comparison ----------------
@router.post("/competitors", response_model=CompetitorResponse)
def compare_competitors(
    req: CompetitorRequest,
    live: bool = Query(default=True),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> CompetitorResponse:
    result = competitors.compare(req.ticker, req.peers, live=live)
    _save(db, current, "competitors", result.ticker, f"Peers — {result.ticker}", result.model_dump())
    return result


# ---------------- News sentiment ----------------
@router.post("/sentiment", response_model=SentimentResponse)
def sentiment(
    req: SentimentRequest,
    live: bool = Query(default=True),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> SentimentResponse:
    f = get_fundamentals(req.ticker, live=live)
    result = news.analyze_sentiment(req.ticker, f.get("company", ""), req.query)
    _save(db, current, "sentiment", result.ticker, f"Sentiment — {result.ticker}", result.model_dump())
    return result


# ---------------- Saved analyses ----------------
@router.get("/analyses")
def list_analyses(
    kind: str | None = None,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[dict]:
    stmt = select(SavedAnalysis).where(SavedAnalysis.owner_id == current.id)
    if kind:
        stmt = stmt.where(SavedAnalysis.kind == kind)
    stmt = stmt.order_by(SavedAnalysis.created_at.desc()).limit(50)
    items = db.execute(stmt).scalars().all()
    return [
        {
            "id": a.id,
            "kind": a.kind,
            "ticker": a.ticker,
            "title": a.title,
            "created_at": a.created_at.isoformat(),
            "payload": json.loads(a.payload or "{}"),
        }
        for a in items
    ]


def _save(db: Session, current: User, kind: str, ticker: str, title: str, payload: dict) -> None:
    db.add(
        SavedAnalysis(
            owner_id=current.id,
            kind=kind,
            ticker=ticker,
            title=title,
            payload=json.dumps(payload, default=str),
        )
    )
    db.commit()
