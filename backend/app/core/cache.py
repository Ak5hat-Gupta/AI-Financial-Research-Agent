"""Caching abstraction.

Backed by Redis when ``REDIS_URL`` is configured, otherwise an in-process TTL
cache so development and tests need no external service. The public interface is
intentionally tiny: ``get``, ``set``, ``delete`` and a ``cached`` decorator.
"""
from __future__ import annotations

import functools
import json
import time
from typing import Any, Callable

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("atlas.cache")


class _InProcessCache:
    """Thread-naive TTL cache. Adequate for a single dev/test worker."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[float, str]] = {}

    def get(self, key: str) -> str | None:
        item = self._store.get(key)
        if not item:
            return None
        expires_at, value = item
        if expires_at < time.time():
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: str, ttl: int) -> None:
        self._store[key] = (time.time() + ttl, value)

    def delete(self, key: str) -> None:
        self._store.pop(key, None)


class CacheService:
    def __init__(self) -> None:
        self._redis = None
        self._fallback = _InProcessCache()
        if settings.redis_url:
            try:
                import redis  # type: ignore

                self._redis = redis.Redis.from_url(
                    settings.redis_url, decode_responses=True, socket_connect_timeout=2
                )
                self._redis.ping()
                log.info("cache backend ready", extra={"backend": "redis"})
            except Exception as exc:  # pragma: no cover - depends on env
                log.warning("redis unavailable, using in-process cache", extra={"error": str(exc)})
                self._redis = None

    @property
    def backend(self) -> str:
        return "redis" if self._redis is not None else "in-process"

    def healthy(self) -> bool:
        if self._redis is None:
            return True  # in-process is always available
        try:
            return bool(self._redis.ping())
        except Exception:  # pragma: no cover
            return False

    def get_json(self, key: str) -> Any | None:
        raw = self._redis.get(key) if self._redis else self._fallback.get(key)
        return json.loads(raw) if raw else None

    def set_json(self, key: str, value: Any, ttl: int | None = None) -> None:
        ttl = ttl or settings.cache_ttl_seconds
        raw = json.dumps(value, default=str)
        if self._redis:
            self._redis.setex(key, ttl, raw)
        else:
            self._fallback.set(key, raw, ttl)

    def delete(self, key: str) -> None:
        if self._redis:
            self._redis.delete(key)
        else:
            self._fallback.delete(key)


_cache: CacheService | None = None


def get_cache() -> CacheService:
    global _cache
    if _cache is None:
        _cache = CacheService()
    return _cache


def cached(prefix: str, ttl: int | None = None) -> Callable:
    """Decorator that memoizes a function's JSON-serialisable return value.

    The cache key is the prefix plus the positional/keyword arguments.
    """

    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            cache = get_cache()
            key = f"{prefix}:{json.dumps([args, kwargs], default=str, sort_keys=True)}"
            hit = cache.get_json(key)
            if hit is not None:
                return hit
            result = fn(*args, **kwargs)
            try:
                cache.set_json(key, result, ttl)
            except TypeError:
                pass  # non-serialisable result; skip caching
            return result

        return wrapper

    return decorator
