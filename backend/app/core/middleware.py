"""ASGI middleware: request correlation, access logging, and rate limiting."""
from __future__ import annotations

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.cache import get_cache
from app.core.config import settings
from app.core.logging import get_logger, request_id_ctx

access_log = get_logger("atlas.access")


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Assigns a request id, times the request, and emits a structured log line."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        token = request_id_ctx.set(request_id)
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            access_log.exception(
                "unhandled error",
                extra={"method": request.method, "path": request.url.path},
            )
            raise
        finally:
            request_id_ctx.reset(token)

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["x-request-id"] = request_id
        response.headers["x-response-time-ms"] = str(elapsed_ms)
        access_log.info(
            "request",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": elapsed_ms,
            },
        )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Fixed-window per-client rate limit using the cache backend.

    Keyed by client IP + the current minute. Disabled in tests via settings.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        if not settings.rate_limit_enabled or request.url.path in _EXEMPT:
            return await call_next(request)

        client = request.client.host if request.client else "anon"
        window = int(time.time() // 60)
        key = f"ratelimit:{client}:{window}"
        cache = get_cache()
        count = (cache.get_json(key) or 0) + 1
        cache.set_json(key, count, ttl=60)

        if count > settings.rate_limit_per_minute:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Try again shortly."},
                headers={"Retry-After": "60"},
            )
        return await call_next(request)


_EXEMPT = {"/health", "/", "/docs", "/redoc", "/openapi.json"}
