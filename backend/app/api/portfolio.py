from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.portfolio import PortfolioHolding
from app.models.user import User
from app.schemas.finance import HoldingIn, PortfolioRecommendation
from app.services.portfolio import build_recommendation

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/holdings")
def list_holdings(
    db: Session = Depends(get_db), current: User = Depends(get_current_user)
) -> list[dict]:
    rows = (
        db.execute(select(PortfolioHolding).where(PortfolioHolding.owner_id == current.id))
        .scalars()
        .all()
    )
    return [
        {"id": r.id, "ticker": r.ticker, "shares": r.shares, "cost_basis": r.cost_basis}
        for r in rows
    ]


@router.post("/holdings", status_code=201)
def add_holding(
    payload: HoldingIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    ticker = payload.ticker.upper().strip()
    existing = db.execute(
        select(PortfolioHolding).where(
            PortfolioHolding.owner_id == current.id, PortfolioHolding.ticker == ticker
        )
    ).scalar_one_or_none()
    if existing:
        # Merge into a weighted average cost basis.
        total_shares = existing.shares + payload.shares
        if total_shares > 0:
            existing.cost_basis = (
                existing.cost_basis * existing.shares + payload.cost_basis * payload.shares
            ) / total_shares
        existing.shares = total_shares
        db.commit()
        db.refresh(existing)
        h = existing
    else:
        h = PortfolioHolding(
            owner_id=current.id,
            ticker=ticker,
            shares=payload.shares,
            cost_basis=payload.cost_basis,
        )
        db.add(h)
        db.commit()
        db.refresh(h)
    return {"id": h.id, "ticker": h.ticker, "shares": h.shares, "cost_basis": h.cost_basis}


@router.delete("/holdings/{holding_id}", status_code=204, response_class=Response)
def delete_holding(
    holding_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)
) -> Response:
    h = db.get(PortfolioHolding, holding_id)
    if not h or h.owner_id != current.id:
        raise HTTPException(status_code=404, detail="Holding not found.")
    db.delete(h)
    db.commit()
    return Response(status_code=204)


@router.get("/recommendations", response_model=PortfolioRecommendation)
def recommendations(
    live: bool = Query(default=True),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> PortfolioRecommendation:
    holdings = (
        db.execute(select(PortfolioHolding).where(PortfolioHolding.owner_id == current.id))
        .scalars()
        .all()
    )
    return build_recommendation(holdings, live=live)
