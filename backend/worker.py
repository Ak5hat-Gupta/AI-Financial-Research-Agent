"""RQ worker entrypoint.  Run with:  python worker.py  (requires REDIS_URL).

In Docker this is the `worker` service. With no Redis configured the API falls
back to inline execution and no worker is needed.
"""
from __future__ import annotations

from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.tasks import QUEUE_NAME

log = get_logger("atlas.worker")


def main() -> None:
    configure_logging()
    if not settings.redis_url:
        raise SystemExit("REDIS_URL is not set; the API runs jobs inline without a worker.")
    from redis import Redis
    from rq import Queue, Worker

    conn = Redis.from_url(settings.redis_url)
    log.info("worker starting", extra={"queue": QUEUE_NAME})
    Worker([Queue(QUEUE_NAME, connection=conn)], connection=conn).work()


if __name__ == "__main__":
    main()
