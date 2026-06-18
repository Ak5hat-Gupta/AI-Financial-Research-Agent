"""FastAPI application entrypoint."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api import auth, chat, documents, finance, portfolio
from app.core.config import settings
from app.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description="An AI-powered equity research workspace — chat with filings, run DCF "
    "valuations, ratio analysis, peer comparison, news sentiment and portfolio analytics.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = settings.api_v1_prefix
app.include_router(auth.router, prefix=api)
app.include_router(documents.router, prefix=api)
app.include_router(chat.router, prefix=api)
app.include_router(finance.router, prefix=api)
app.include_router(portfolio.router, prefix=api)


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {
        "status": "ok",
        "version": __version__,
        "environment": settings.environment,
        "llm_provider": settings.effective_provider,
    }


@app.get("/", tags=["meta"])
def root() -> dict:
    return {
        "name": settings.app_name,
        "docs": "/docs",
        "health": "/health",
    }
