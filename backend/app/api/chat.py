from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.chat import ChatMessage, ChatSession
from app.models.user import User
from app.schemas.chat import (
    ChatAsk,
    ChatMessageOut,
    ChatResponse,
    ChatSessionOut,
    Citation,
)
from app.services.rag import answer_question

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/sessions", response_model=list[ChatSessionOut])
def list_sessions(
    db: Session = Depends(get_db), current: User = Depends(get_current_user)
) -> list[ChatSessionOut]:
    sessions = (
        db.execute(
            select(ChatSession)
            .where(ChatSession.owner_id == current.id)
            .order_by(ChatSession.created_at.desc())
        )
        .scalars()
        .all()
    )
    return [ChatSessionOut.model_validate(s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=list[ChatMessageOut])
def get_messages(
    session_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)
) -> list[ChatMessageOut]:
    session = _owned_session(db, session_id, current)
    out = []
    for m in session.messages:
        out.append(
            ChatMessageOut(
                id=m.id,
                role=m.role,
                content=m.content,
                citations=[Citation(**c) for c in json.loads(m.citations or "[]")],
                created_at=m.created_at,
            )
        )
    return out


@router.post("/ask", response_model=ChatResponse)
def ask(
    payload: ChatAsk, db: Session = Depends(get_db), current: User = Depends(get_current_user)
) -> ChatResponse:
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Resolve / create session.
    if payload.session_id:
        session = _owned_session(db, payload.session_id, current)
    else:
        session = ChatSession(
            owner_id=current.id,
            document_id=payload.document_id,
            title=payload.message[:60],
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    db.add(ChatMessage(session_id=session.id, role="user", content=payload.message))
    db.commit()

    answer, citations = answer_question(
        db, current.id, payload.message, document_id=payload.document_id or session.document_id
    )

    db.add(
        ChatMessage(
            session_id=session.id,
            role="assistant",
            content=answer,
            citations=json.dumps(citations),
        )
    )
    db.commit()

    return ChatResponse(
        session_id=session.id,
        answer=answer,
        citations=[Citation(**c) for c in citations],
    )


@router.delete("/sessions/{session_id}", status_code=204, response_class=Response)
def delete_session(
    session_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)
) -> Response:
    session = _owned_session(db, session_id, current)
    db.delete(session)
    db.commit()
    return Response(status_code=204)


def _owned_session(db: Session, session_id: int, current: User) -> ChatSession:
    session = db.get(ChatSession, session_id)
    if not session or session.owner_id != current.id:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    return session
