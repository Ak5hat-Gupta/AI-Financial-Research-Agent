from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SavedAnalysis(Base):
    """Persisted output of a valuation / ratio / competitor / sentiment run."""

    __tablename__ = "saved_analyses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(32), index=True)  # dcf|ratios|competitors|sentiment
    ticker: Mapped[str] = mapped_column(String(16), default="")
    title: Mapped[str] = mapped_column(String(255), default="")
    payload: Mapped[str] = mapped_column(Text, default="{}")  # JSON
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    owner = relationship("User", back_populates="analyses")
