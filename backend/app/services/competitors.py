"""Peer / competitor comparison built on the market-data layer."""
from __future__ import annotations

from app.schemas.finance import CompetitorResponse
from app.services.llm import get_llm
from app.services.market_data import get_fundamentals


def _safe(a, b):
    try:
        return round(a / b, 2) if a is not None and b not in (None, 0) else None
    except (TypeError, ZeroDivisionError):
        return None


def _row(f: dict) -> dict:
    return {
        "ticker": f["ticker"],
        "company": f.get("company", f["ticker"]),
        "price": f.get("price"),
        "market_cap": f.get("market_cap"),
        "pe": _safe(f.get("price"), f.get("eps")),
        "gross_margin": _safe((f.get("gross_profit") or 0) * 100, f.get("revenue")),
        "net_margin": _safe((f.get("net_income") or 0) * 100, f.get("revenue")),
        "roe": _safe((f.get("net_income") or 0) * 100, f.get("total_equity")),
        "debt_to_equity": _safe(f.get("total_debt"), f.get("total_equity")),
        "revenue": f.get("revenue"),
    }


def compare(ticker: str, peers: list[str], live: bool = True) -> CompetitorResponse:
    ticker = ticker.upper()
    base = get_fundamentals(ticker, live=live)
    peer_list = [p.upper() for p in peers] if peers else [
        p for p in base.get("peers", []) if p.isalpha()
    ][:4]

    rows = [_row(base)]
    for p in peer_list:
        if p == ticker:
            continue
        rows.append(_row(get_fundamentals(p, live=live)))

    metrics = ["price", "market_cap", "pe", "gross_margin", "net_margin", "roe", "debt_to_equity"]

    commentary = get_llm().complete(
        "You are an equity analyst comparing a company to its peers. Be concise and "
        "highlight where the target leads or lags on valuation, margins and returns.",
        f"Target: {ticker}\nPeer table (JSON rows):\n{rows}\n\n"
        "Write a 3-4 sentence competitive read.",
        max_tokens=400,
    )

    return CompetitorResponse(
        ticker=ticker,
        peers=rows,
        metrics=metrics,
        commentary=commentary,
    )
