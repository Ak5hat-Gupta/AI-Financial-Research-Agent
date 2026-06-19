from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.analysis import SavedAnalysis
from app.models.user import User
from app.schemas.memo import MemoRequest, MemoResponse
from app.services.memo import generate_memo, memo_to_pdf

router = APIRouter(prefix="/memo", tags=["memo"])


@router.post("", response_model=MemoResponse)
def create_memo(
    req: MemoRequest,
    live: bool = Query(default=False),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> MemoResponse:
    memo = generate_memo(req.ticker, live=live)
    row = SavedAnalysis(
        owner_id=current.id, kind="memo", ticker=memo.ticker,
        title=f"Memo — {memo.company}", payload=memo.model_dump_json(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    memo.id = row.id
    memo.created_at = row.created_at.isoformat()
    return memo


@router.get("", response_model=list[MemoResponse])
def list_memos(db: Session = Depends(get_db), current: User = Depends(get_current_user)) -> list[MemoResponse]:
    rows = db.execute(
        select(SavedAnalysis)
        .where(SavedAnalysis.owner_id == current.id, SavedAnalysis.kind == "memo")
        .order_by(SavedAnalysis.created_at.desc())
        .limit(50)
    ).scalars().all()
    return [_load(r) for r in rows]


@router.get("/{memo_id}", response_model=MemoResponse)
def get_memo(memo_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)) -> MemoResponse:
    return _load(_owned(db, memo_id, current))


@router.get("/{memo_id}/pdf")
def memo_pdf(memo_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)) -> Response:
    memo = _load(_owned(db, memo_id, current))
    pdf = memo_to_pdf(memo)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{memo.ticker}_memo.pdf"'},
    )


def _owned(db: Session, memo_id: int, current: User) -> SavedAnalysis:
    row = db.get(SavedAnalysis, memo_id)
    if not row or row.owner_id != current.id or row.kind != "memo":
        raise HTTPException(status_code=404, detail="Memo not found.")
    return row


def _load(row: SavedAnalysis) -> MemoResponse:
    memo = MemoResponse.model_validate(json.loads(row.payload))
    memo.id = row.id
    memo.created_at = row.created_at.isoformat()
    return memo
