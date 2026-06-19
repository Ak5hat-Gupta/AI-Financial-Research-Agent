from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, hash_password
from app.models.user import User
from app.repositories import UserRepository
from app.services import oauth as oauth_svc

router = APIRouter(prefix="/auth/oauth", tags=["auth"])


@router.get("/providers")
def providers() -> dict:
    return oauth_svc.enabled()


@router.get("/{provider}/login")
def login(provider: str):
    if provider not in ("google", "github") or not oauth_svc.enabled().get(provider):
        raise HTTPException(status_code=404, detail="Provider not enabled.")
    url = oauth_svc.authorize_url(provider, state=secrets.token_urlsafe(16))
    return RedirectResponse(url)


@router.get("/{provider}/callback")
def callback(provider: str, code: str = Query(...), db: Session = Depends(get_db)):
    if provider not in ("google", "github") or not oauth_svc.enabled().get(provider):
        raise HTTPException(status_code=404, detail="Provider not enabled.")
    try:
        info = oauth_svc.exchange_code(provider, code)
    except Exception as exc:  # pragma: no cover - network dependent
        raise HTTPException(status_code=400, detail=f"OAuth failed: {exc}")

    users = UserRepository(db)
    user = users.get_by_email(info["email"])
    if not user:
        user = users.add(User(
            email=info["email"], full_name=info.get("name", ""),
            hashed_password=hash_password(secrets.token_urlsafe(24)),
        ))
    token = create_access_token(user.id)
    return RedirectResponse(f"{settings.oauth_redirect_base}/login#token={token}")
