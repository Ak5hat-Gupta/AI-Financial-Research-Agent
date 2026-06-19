from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.watchlist import Notification, WatchlistItem
from app.services.market_data import get_fundamentals
from app.services.watchlist import updates_for

router = APIRouter(tags=["watchlist"])


class WatchIn(BaseModel):
    ticker: str = Field(min_length=1, max_length=16)


@router.get("/watchlist")
def list_watchlist(db: Session = Depends(get_db), current: User = Depends(get_current_user)) -> list[dict]:
    items = db.execute(
        select(WatchlistItem).where(WatchlistItem.owner_id == current.id).order_by(WatchlistItem.created_at.desc())
    ).scalars().all()
    out = []
    for it in items:
        f = get_fundamentals(it.ticker, live=False)
        out.append({"id": it.id, "ticker": it.ticker, "company": f.get("company"), "price": f.get("price"),
                    "sector": f.get("sector"), "market_cap": f.get("market_cap")})
    return out


@router.post("/watchlist", status_code=201)
def add_watch(payload: WatchIn, db: Session = Depends(get_db), current: User = Depends(get_current_user)) -> dict:
    tk = payload.ticker.upper().strip()
    existing = db.execute(
        select(WatchlistItem).where(WatchlistItem.owner_id == current.id, WatchlistItem.ticker == tk)
    ).scalar_one_or_none()
    if existing:
        return {"id": existing.id, "ticker": tk}
    item = WatchlistItem(owner_id=current.id, ticker=tk)
    db.add(item); db.commit(); db.refresh(item)
    return {"id": item.id, "ticker": tk}


@router.delete("/watchlist/{item_id}", status_code=204, response_class=Response)
def remove_watch(item_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)) -> Response:
    item = db.get(WatchlistItem, item_id)
    if not item or item.owner_id != current.id:
        raise HTTPException(status_code=404, detail="Not found.")
    db.delete(item); db.commit()
    return Response(status_code=204)


@router.post("/watchlist/refresh")
def refresh_updates(db: Session = Depends(get_db), current: User = Depends(get_current_user)) -> dict:
    """Generate notifications for the user's watched tickers."""
    tickers = [i.ticker for i in db.execute(
        select(WatchlistItem).where(WatchlistItem.owner_id == current.id)
    ).scalars().all()]
    created = 0
    for u in updates_for(tickers):
        db.add(Notification(owner_id=current.id, kind=u["kind"], ticker=u["ticker"], title=u["title"], body=u["body"]))
        created += 1
    db.commit()
    return {"created": created}


@router.get("/notifications")
def list_notifications(db: Session = Depends(get_db), current: User = Depends(get_current_user)) -> list[dict]:
    rows = db.execute(
        select(Notification).where(Notification.owner_id == current.id).order_by(Notification.created_at.desc()).limit(50)
    ).scalars().all()
    return [{"id": n.id, "kind": n.kind, "ticker": n.ticker, "title": n.title, "body": n.body,
             "read": n.read, "created_at": n.created_at.isoformat()} for n in rows]


@router.post("/notifications/read", status_code=204, response_class=Response)
def mark_all_read(db: Session = Depends(get_db), current: User = Depends(get_current_user)) -> Response:
    for n in db.execute(select(Notification).where(Notification.owner_id == current.id, Notification.read == False)).scalars().all():  # noqa: E712
        n.read = True
    db.commit()
    return Response(status_code=204)
