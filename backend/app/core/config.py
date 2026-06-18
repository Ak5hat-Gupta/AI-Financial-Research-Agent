"""Application configuration, loaded from environment variables / .env."""
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

    # App
    app_name: str = "AI Financial Research Agent"
    environment: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api"

    # Security
    secret_key: str = "change-me-please-generate-a-long-random-secret"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    algorithm: str = "HS256"

    # Database
    database_url: str = "sqlite:///./financial_agent.db"

    # CORS
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:4173",
    ]

    # LLM
    llm_provider: str = "demo"  # anthropic | openai | demo
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    openai_embedding_model: str = "text-embedding-3-small"

    # Data providers
    newsapi_key: str = ""

    # Uploads
    upload_dir: str = "./uploads"
    max_upload_mb: int = 25

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
    def effective_provider(self) -> str:
        """Resolve which LLM provider to actually use based on keys present."""
        provider = (self.llm_provider or "demo").lower()
        if provider == "anthropic" and self.anthropic_api_key:
            return "anthropic"
        if provider == "openai" and self.openai_api_key:
            return "openai"
        # Auto-detect if a key is present but provider left as demo
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
