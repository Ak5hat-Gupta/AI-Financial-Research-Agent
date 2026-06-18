"""Application configuration, loaded from environment variables / .env.

Atlas uses a single typed settings object (Pydantic) as the composition root for
configuration. It is imported wherever configuration is required and cached so the
environment is read exactly once per process.
"""
from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ---- App ----
    app_name: str = "Atlas"
    app_description: str = "AI-powered equity research platform"
    environment: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    # ---- Security / auth ----
    secret_key: str = "change-me-please-generate-a-long-random-secret"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    algorithm: str = "HS256"

    # OAuth (optional; feature-flagged on when client ids are present)
    google_client_id: str = ""
    google_client_secret: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""
    oauth_redirect_base: str = "http://localhost:3000"

    # ---- Persistence ----
    database_url: str = "sqlite:///./atlas.db"
    redis_url: str = ""  # empty -> in-process cache fallback
    # Reserved for Phase 3 (knowledge graph / dedicated vector store)
    neo4j_uri: str = ""
    neo4j_user: str = "neo4j"
    neo4j_password: str = ""
    qdrant_url: str = ""

    # ---- CORS ----
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:4173",
    ]

    # ---- LLM ----
    llm_provider: str = "demo"  # anthropic | openai | demo
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    openai_embedding_model: str = "text-embedding-3-small"

    # ---- Data providers ----
    newsapi_key: str = ""

    # ---- Uploads ----
    upload_dir: str = "./uploads"
    max_upload_mb: int = 25

    # ---- Observability ----
    log_level: str = "INFO"
    log_json: bool = True  # structured JSON logs (set false for pretty dev logs)

    # ---- Rate limiting ----
    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = 120

    # ---- Caching ----
    cache_ttl_seconds: int = 300

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def cache_enabled(self) -> bool:
        return bool(self.redis_url)

    @property
    def oauth_google_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @property
    def oauth_github_enabled(self) -> bool:
        return bool(self.github_client_id and self.github_client_secret)

    @property
    def effective_provider(self) -> str:
        """Resolve which LLM provider to actually use based on keys present."""
        provider = (self.llm_provider or "demo").lower()
        if provider == "anthropic" and self.anthropic_api_key:
            return "anthropic"
        if provider == "openai" and self.openai_api_key:
            return "openai"
        if provider == "demo":
            if self.anthropic_api_key:
                return "anthropic"
            if self.openai_api_key:
                return "openai"
        return "demo"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
