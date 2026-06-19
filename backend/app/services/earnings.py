"""Earnings-call transcript intelligence.

Scores tone, estimates management confidence, and ranks discussed topics from a
transcript — using a transparent lexicon so it works offline, with an LLM summary
when a provider is configured.
"""
from __future__ import annotations

import re
from collections import Counter

from app.services.llm import get_llm
from app.services.news import _NEGATIVE, _POSITIVE

_TOPICS = {
    "revenue": ["revenue", "sales", "top line", "bookings"],
    "margins": ["margin", "gross margin", "operating margin", "profitability"],
    "guidance": ["guidance", "outlook", "forecast", "expect", "next quarter", "full year"],
    "demand": ["demand", "pipeline", "backlog", "orders"],
    "costs": ["cost", "expense", "headcount", "inflation", "supply chain"],
    "capital": ["buyback", "dividend", "capital", "cash flow", "balance sheet"],
    "product": ["product", "launch", "platform", "innovation", "ai"],
    "competition": ["competition", "competitor", "market share", "pricing"],
}
_CONFIDENCE = ["confident", "strong", "pleased", "record", "momentum", "robust", "accelerate", "raising"]
_HEDGE = ["uncertain", "cautious", "headwind", "challenging", "soft", "weak", "pressure", "decline"]
_WORD = re.compile(r"[a-zA-Z']+")


def analyze_transcript(text: str, ticker: str = "") -> dict:
    low = text.lower()
    words = _WORD.findall(low)
    n = max(len(words), 1)

    pos = sum(low.count(w) for w in _POSITIVE)
    neg = sum(low.count(w) for w in _NEGATIVE)
    tone = round((pos - neg) / (pos + neg), 3) if (pos + neg) else 0.0
    overall = "positive" if tone > 0.15 else "negative" if tone < -0.15 else "neutral"

    conf = sum(low.count(w) for w in _CONFIDENCE)
    hedge = sum(low.count(w) for w in _HEDGE)
    confidence = round(max(0.0, min(1.0, 0.5 + (conf - hedge) / 40)), 2)
    confidence_label = "High" if confidence >= 0.66 else "Guarded" if confidence >= 0.4 else "Low"

    topics = []
    for topic, kws in _TOPICS.items():
        count = sum(low.count(k) for k in kws)
        if count:
            topics.append({"topic": topic, "mentions": count, "weight": round(count / n * 1000, 1)})
    topics.sort(key=lambda t: t["mentions"], reverse=True)

    common = [w for w, _ in Counter(w for w in words if len(w) > 6).most_common(8)]

    summary = get_llm().complete(
        "You are an analyst summarising an earnings call. In 3-4 sentences cover tone, "
        "management confidence, and the most-discussed topics. Use the supplied signals.",
        f"Ticker: {ticker or 'n/a'}\nTone: {overall} ({tone})\nConfidence: {confidence_label} ({confidence})\n"
        f"Top topics: {[t['topic'] for t in topics[:5]]}\nExcerpt: {text[:1500]}",
        max_tokens=300,
    )

    return {
        "ticker": ticker.upper(),
        "overall": overall,
        "tone": tone,
        "confidence": confidence,
        "confidence_label": confidence_label,
        "positive_signals": pos,
        "negative_signals": neg,
        "topics": topics[:8],
        "keywords": common,
        "word_count": len(words),
        "summary": summary,
    }
