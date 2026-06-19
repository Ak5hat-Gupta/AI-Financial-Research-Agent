"""Watchlist daily-update generation (deterministic, demo-friendly)."""
from __future__ import annotations

import hashlib

from app.services.market_data import get_fundamentals

_TEMPLATES = [
    ("earnings", "{co} reports earnings", "Consensus expects continued revenue growth; watch margins and guidance."),
    ("analyst", "Analyst action on {tk}", "A sell-side desk reiterated its rating with a revised price target."),
    ("news", "{co} in the headlines", "Coverage centres on product momentum and competitive positioning."),
    ("insider", "Insider activity at {tk}", "A Form 4 filing shows recent insider transaction activity."),
    ("news", "{co} product update", "The company signalled a new launch within its core segment."),
]


def updates_for(tickers: list[str]) -> list[dict]:
    out: list[dict] = []
    for tk in tickers:
        f = get_fundamentals(tk, live=False)
        co = f.get("company", tk)
        seed = int(hashlib.md5(tk.encode()).hexdigest(), 16)
        kind, title, body = _TEMPLATES[seed % len(_TEMPLATES)]
        out.append({"kind": kind, "ticker": tk, "title": title.format(co=co, tk=tk), "body": body})
    return out
