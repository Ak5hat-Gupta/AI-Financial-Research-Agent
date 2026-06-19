"""Optional Qdrant-backed vector search.

When ``QDRANT_URL`` is set, document-chunk embeddings are mirrored to Qdrant and
retrieval queries it (returning chunk ids + scores). Without it, the app uses the
in-database cosine search in ``rag`` — so this module is a no-op by default.
"""
from __future__ import annotations

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("atlas.vectorstore")
COLLECTION = "atlas_chunks"


def enabled() -> bool:
    return bool(settings.qdrant_url)


def _client():
    from qdrant_client import QdrantClient

    return QdrantClient(url=settings.qdrant_url, timeout=10)


def _ensure(client, dim: int) -> None:
    from qdrant_client.models import Distance, VectorParams

    existing = {c.name for c in client.get_collections().collections}
    if COLLECTION not in existing:
        client.create_collection(COLLECTION, vectors_config=VectorParams(size=dim, distance=Distance.COSINE))


def upsert_chunks(owner_id: int, document_id: int, rows: list[tuple[int, int, list[float]]]) -> None:
    """rows: list of (chunk_id, page, embedding)."""
    if not enabled() or not rows:
        return
    try:
        from qdrant_client.models import PointStruct

        client = _client()
        _ensure(client, len(rows[0][2]))
        points = [
            PointStruct(id=cid, vector=emb, payload={"owner_id": owner_id, "document_id": document_id, "page": page})
            for cid, page, emb in rows
        ]
        client.upsert(COLLECTION, points=points)
    except Exception as exc:  # pragma: no cover - external service
        log.warning("qdrant upsert failed", extra={"error": str(exc)})


def search(owner_id: int, query_emb: list[float], document_id: int | None, k: int) -> list[tuple[int, float]]:
    """Return [(chunk_id, score)] for the owner, optionally scoped to a document."""
    try:
        from qdrant_client.models import FieldCondition, Filter, MatchValue

        must = [FieldCondition(key="owner_id", match=MatchValue(value=owner_id))]
        if document_id is not None:
            must.append(FieldCondition(key="document_id", match=MatchValue(value=document_id)))
        hits = _client().search(COLLECTION, query_vector=query_emb, query_filter=Filter(must=must), limit=k)
        return [(int(h.id), float(h.score)) for h in hits]
    except Exception as exc:  # pragma: no cover
        log.warning("qdrant search failed", extra={"error": str(exc)})
        return []
