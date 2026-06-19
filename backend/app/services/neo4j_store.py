"""Optional Neo4j persistence for the knowledge graph.

When ``NEO4J_URI`` is configured, ``sync_graph`` MERGEs the derived nodes and
edges into Neo4j. It is best-effort and never blocks graph responses.
"""
from __future__ import annotations

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("atlas.neo4j")


def enabled() -> bool:
    return bool(settings.neo4j_uri)


def sync_graph(graph: dict) -> None:
    if not enabled():
        return
    try:
        from neo4j import GraphDatabase

        driver = GraphDatabase.driver(settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password))
        with driver.session() as session:
            for n in graph["nodes"]:
                session.run(
                    "MERGE (x:Entity {id:$id}) SET x.label=$label, x.kind=$kind",
                    id=n["id"], label=n["label"], kind=n["kind"],
                )
            for e in graph["edges"]:
                session.run(
                    "MATCH (a:Entity {id:$s}),(b:Entity {id:$t}) MERGE (a)-[r:REL {type:$rel}]->(b)",
                    s=e["source"], t=e["target"], rel=e["rel"],
                )
        driver.close()
    except Exception as exc:  # pragma: no cover - external service
        log.warning("neo4j sync failed", extra={"error": str(exc)})
