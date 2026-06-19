"""Version 1 of the Atlas REST API.

Aggregates every feature router behind a single ``APIRouter`` that ``main`` mounts
under ``settings.api_v1_prefix`` (``/api/v1``). New API versions get their own
package alongside this one, leaving v1 contracts stable.
"""
from fastapi import APIRouter

from app.api import auth, chat, documents, finance, portfolio

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(documents.router)
api_router.include_router(chat.router)
api_router.include_router(finance.router)
api_router.include_router(portfolio.router)

__all__ = ["api_router"]
