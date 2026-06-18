"""News retrieval + lightweight sentiment scoring.

Uses NewsAPI when a key is set; otherwise generates a realistic sample feed.
Sentiment is computed with a transparent lexicon so it works fully offline,
then summarised by the LLM layer.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.schemas.finance import NewsItem, SentimentResponse
from app.services.llm import get_llm

_POSITIVE = {
    "beat", "beats", "surge", "surges", "record", "growth", "profit", "upgrade",
    "outperform", "bullish", "rally", "gains", "strong", "expansion", "raises",
    "tops", "soars", "wins", "approval", "breakthrough", "momentum", "buyback",
}
_NEGATIVE = {
    "miss", "misses", "plunge", "plunges", "loss", "lawsuit", "downgrade", "probe",
    "bearish", "decline", "weak", "cuts", "recall", "fraud", "slump", "warning",
    "layoffs", "investigation", "falls", "drops", "concern", "risk", "selloff",
}

_SAMPLE_HEADLINES = [
    ("{co} tops quarterly revenue estimates as core segment accelerates", "Reuters"),
    ("Analysts raise price target on {co} citing margin expansion", "Bloomberg"),
    ("{co} unveils new product line, shares rally in pre-market", "CNBC"),
    ("Regulators open probe into {co} business practices", "Financial Times"),
    ("{co} guidance disappoints; stock slumps after hours", "MarketWatch"),
    ("Supply chain pressure weighs on {co} outlook, analysts warn", "WSJ"),
    ("{co} announces $10B buyback and dividend increase", "Barron's"),
    ("Institutional investors trim {co} holdings amid valuation concerns", "Seeking Alpha"),
]


def _score_text(text: str) -> float:
    words = text.lower().replace(",", " ").replace(".", " ").split()
    pos = sum(1 for w in words if w in _POSITIVE)
    neg = sum(1 for w in words if w in _NEGATIVE)
    if pos == neg == 0:
        return 0.0
    return round((pos - neg) / (pos + neg), 3)


def _label(score: float) -> str:
    if score > 0.15:
        return "positive"
    if score < -0.15:
        return "negative"
    return "neutral"


def _fetch_newsapi(query: str) -> list[dict]:
    import httpx

    url = "https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 12,
        "apiKey": settings.newsapi_key,
    }
    r = httpx.get(url, params=params, timeout=10)
    r.raise_for_status()
    return r.json().get("articles", [])


def _sample_feed(ticker: str, company: str) -> list[dict]:
    now = datetime.now(timezone.utc)
    seed = int(hashlib.md5(ticker.encode()).hexdigest(), 16)
    items = []
    for i, (tmpl, source) in enumerate(_SAMPLE_HEADLINES):
        # Deterministic per-ticker rotation so each company looks distinct.
        if (seed >> i) % 5 == 4 and i > 4:
            continue
        items.append(
            {
                "title": tmpl.format(co=company or ticker),
                "source": {"name": source},
                "url": f"https://example.com/news/{ticker.lower()}/{i}",
                "publishedAt": (now - timedelta(hours=6 * i + (seed % 5))).isoformat(),
            }
        )
    return items


def analyze_sentiment(ticker: str, company: str = "", query: str | None = None) -> SentimentResponse:
    ticker = ticker.upper()
    q = query or company or ticker

    raw: list[dict] = []
    if settings.newsapi_key:
        try:
            raw = _fetch_newsapi(q)
        except Exception:
            raw = []
    if not raw:
        raw = _sample_feed(ticker, company)

    items: list[NewsItem] = []
    dist = {"positive": 0, "neutral": 0, "negative": 0}
    total = 0.0
    for a in raw[:12]:
        title = a.get("title") or ""
        if not title:
            continue
        score = _score_text(title + " " + (a.get("description") or ""))
        label = _label(score)
        dist[label] += 1
        total += score
        items.append(
            NewsItem(
                title=title,
                source=(a.get("source") or {}).get("name", "Unknown"),
                url=a.get("url", "#"),
                published_at=a.get("publishedAt", ""),
                sentiment=label,
                score=score,
            )
        )

    n = max(len(items), 1)
    overall_score = round(total / n, 3)
    overall = _label(overall_score)

    commentary = get_llm().complete(
        "You are a market sentiment analyst. Summarise the news tone in 2-3 sentences "
        "and flag the single most material headline.",
        f"Ticker: {ticker}\nHeadlines:\n"
        + "\n".join(f"- ({it.sentiment}) {it.title}" for it in items),
        max_tokens=300,
    )

    return SentimentResponse(
        ticker=ticker,
        overall=overall,
        score=overall_score,
        distribution=dist,
        items=items,
        commentary=commentary,
    )
