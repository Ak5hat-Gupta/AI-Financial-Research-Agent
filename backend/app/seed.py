"""Seed the database with a demo user and a starter portfolio.

Run with:  python -m app.seed
Demo login:  demo@fra.ai / demo12345
"""
from __future__ import annotations

from sqlalchemy import select

from app.core.database import SessionLocal, init_db
from app.core.security import hash_password
from app.models.portfolio import PortfolioHolding
from app.models.user import User

DEMO_EMAIL = "demo@fra.ai"
DEMO_PASSWORD = "demo12345"

STARTER_HOLDINGS = [
    ("AAPL", 50, 165.0),
    ("MSFT", 30, 320.0),
    ("NVDA", 80, 95.0),
    ("GOOGL", 40, 140.0),
    ("TSLA", 20, 250.0),
]


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        user = db.execute(select(User).where(User.email == DEMO_EMAIL)).scalar_one_or_none()
        if not user:
            user = User(
                email=DEMO_EMAIL,
                full_name="Demo Analyst",
                hashed_password=hash_password(DEMO_PASSWORD),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")
        else:
            print(f"Demo user already exists: {DEMO_EMAIL}")

        existing = {
            h.ticker
            for h in db.execute(
                select(PortfolioHolding).where(PortfolioHolding.owner_id == user.id)
            ).scalars()
        }
        for ticker, shares, cost in STARTER_HOLDINGS:
            if ticker not in existing:
                db.add(
                    PortfolioHolding(
                        owner_id=user.id, ticker=ticker, shares=shares, cost_basis=cost
                    )
                )
        db.commit()
        print("Seeded starter portfolio.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
