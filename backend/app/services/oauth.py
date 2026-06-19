"""OAuth (Google, GitHub) — authorization URL building and code exchange.

Feature-flagged: a provider is only active when its client id and secret are
configured. All network calls use httpx and are made lazily.
"""
from __future__ import annotations

import urllib.parse

from app.core.config import settings

_CFG = {
    "google": {
        "authorize": "https://accounts.google.com/o/oauth2/v2/auth",
        "token": "https://oauth2.googleapis.com/token",
        "userinfo": "https://openidconnect.googleapis.com/v1/userinfo",
        "scope": "openid email profile",
    },
    "github": {
        "authorize": "https://github.com/login/oauth/authorize",
        "token": "https://github.com/login/oauth/access_token",
        "userinfo": "https://api.github.com/user",
        "scope": "read:user user:email",
    },
}


def enabled() -> dict[str, bool]:
    return {"google": settings.oauth_google_enabled, "github": settings.oauth_github_enabled}


def _creds(provider: str) -> tuple[str, str]:
    if provider == "google":
        return settings.google_client_id, settings.google_client_secret
    if provider == "github":
        return settings.github_client_id, settings.github_client_secret
    raise ValueError("unknown provider")


def redirect_uri(provider: str) -> str:
    # Backend callback (must be registered with the provider).
    return f"{settings.oauth_redirect_base.replace(':3000', ':8000')}{settings.api_v1_prefix}/auth/oauth/{provider}/callback"


def authorize_url(provider: str, state: str) -> str:
    cfg = _CFG[provider]
    cid, _ = _creds(provider)
    q = {
        "client_id": cid,
        "redirect_uri": redirect_uri(provider),
        "scope": cfg["scope"],
        "response_type": "code",
        "state": state,
    }
    return f"{cfg['authorize']}?{urllib.parse.urlencode(q)}"


def exchange_code(provider: str, code: str) -> dict:
    """Exchange an authorization code for the user's email + name."""
    import httpx

    cfg = _CFG[provider]
    cid, secret = _creds(provider)
    data = {
        "client_id": cid,
        "client_secret": secret,
        "code": code,
        "redirect_uri": redirect_uri(provider),
        "grant_type": "authorization_code",
    }
    with httpx.Client(timeout=10, headers={"Accept": "application/json"}) as c:
        tok = c.post(cfg["token"], data=data).json()
        access = tok.get("access_token")
        if not access:
            raise RuntimeError("token exchange failed")
        ui = c.get(cfg["userinfo"], headers={"Authorization": f"Bearer {access}"}).json()
        email = ui.get("email")
        name = ui.get("name") or ui.get("login") or ""
        if not email and provider == "github":
            emails = c.get("https://api.github.com/user/emails", headers={"Authorization": f"Bearer {access}"}).json()
            primary = next((e for e in emails if e.get("primary")), emails[0] if emails else {})
            email = primary.get("email")
    if not email:
        raise RuntimeError("could not resolve email from provider")
    return {"email": email, "name": name}
