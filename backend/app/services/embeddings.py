"""Text embeddings.

Uses OpenAI embeddings when a key is configured, otherwise a deterministic,
dependency-free hashing embedding so semantic search works fully offline.
"""
from __future__ import annotations

import hashlib
import math
import re

from app.core.config import settings

_LOCAL_DIM = 384
_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


def _local_embedding(text: str) -> list[float]:
    """Hashing-trick bag-of-words embedding, L2-normalised."""
    vec = [0.0] * _LOCAL_DIM
    tokens = _tokenize(text)
    if not tokens:
        return vec
    for tok in tokens:
        h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
        idx = h % _LOCAL_DIM
        sign = 1.0 if (h >> 8) % 2 == 0 else -1.0
        vec[idx] += sign
    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]
    return vec


def _openai_embeddings(texts: list[str]) -> list[list[float]]:
    from openai import OpenAI

    client = OpenAI(api_key=settings.openai_api_key)
    resp = client.embeddings.create(model=settings.openai_embedding_model, input=texts)
    return [d.embedding for d in resp.data]


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    if settings.openai_api_key:
        try:
            return _openai_embeddings(texts)
        except Exception:  # pragma: no cover
            pass
    return [_local_embedding(t) for t in texts]


def embed_text(text: str) -> list[float]:
    return embed_texts([text])[0]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)
