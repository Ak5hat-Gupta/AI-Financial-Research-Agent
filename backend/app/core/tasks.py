"""Background task queue.

Uses RQ on Redis when configured, otherwise executes inline and records the
result in the cache. Callers get a job id either way, so the API surface and the
client are identical regardless of whether a worker is running.
"""
from __future__ import annotations

import uuid
from typing import Any, Callable

from app.core.cache import get_cache
from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("atlas.tasks")
QUEUE_NAME = "atlas"


def _queue():
    if not settings.redis_url:
        return None
    try:
        from redis import Redis
        from rq import Queue

        return Queue(QUEUE_NAME, connection=Redis.from_url(settings.redis_url))
    except Exception as exc:  # pragma: no cover
        log.warning("rq unavailable, running inline", extra={"error": str(exc)})
        return None


def enqueue(fn: Callable[..., Any], *args, **kwargs) -> str:
    q = _queue()
    if q is not None:
        job = q.enqueue(fn, *args, job_timeout=300, **kwargs)
        return job.get_id()

    # Inline fallback — execute now, store the result under the job id.
    jid = uuid.uuid4().hex
    cache = get_cache()
    try:
        result = fn(*args, **kwargs)
        cache.set_json(f"job:{jid}", {"status": "finished", "result": result}, ttl=3600)
    except Exception as exc:  # pragma: no cover
        cache.set_json(f"job:{jid}", {"status": "failed", "error": str(exc)}, ttl=3600)
    return jid


def job_status(job_id: str) -> dict:
    if settings.redis_url:
        try:
            from redis import Redis
            from rq.job import Job

            job = Job.fetch(job_id, connection=Redis.from_url(settings.redis_url))
            return {"id": job_id, "status": job.get_status(), "result": job.result}
        except Exception:
            pass
    cached = get_cache().get_json(f"job:{job_id}")
    if cached:
        return {"id": job_id, **cached}
    return {"id": job_id, "status": "unknown", "result": None}
