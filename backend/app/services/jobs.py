"""Job functions executed by the worker (or inline). Must be importable and
return JSON-serialisable results."""
from __future__ import annotations

from app.core.database import SessionLocal
from app.models.analysis import SavedAnalysis
from app.services.memo import generate_memo


def generate_memo_job(ticker: str, owner_id: int, live: bool = False) -> dict:
    """Generate an investment memo and persist it for the owner."""
    memo = generate_memo(ticker, live=live)
    db = SessionLocal()
    try:
        row = SavedAnalysis(
            owner_id=owner_id, kind="memo", ticker=memo.ticker,
            title=f"Memo — {memo.company}", payload=memo.model_dump_json(),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        memo.id = row.id
        memo.created_at = row.created_at.isoformat()
        return memo.model_dump()
    finally:
        db.close()
