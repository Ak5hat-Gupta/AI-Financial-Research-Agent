"""Financial knowledge graph.

Derives a company/sector/peer graph from the fundamentals dataset. The shape
(nodes + edges) matches a property graph, so it can be persisted to Neo4j in
production (``NEO4J_URI``); offline it is built deterministically in-process.
"""
from __future__ import annotations

from app.services.market_data import SAMPLE, get_fundamentals


def _node(id_: str, label: str, kind: str, **extra) -> dict:
    return {"id": id_, "label": label, "kind": kind, **extra}


def build_graph(ticker: str, depth: int = 1, live: bool = False) -> dict:
    ticker = ticker.upper().strip()
    nodes: dict[str, dict] = {}
    edges: list[dict] = []

    def add_company(tk: str) -> dict:
        f = get_fundamentals(tk, live=live)
        nid = f"C:{tk}"
        if nid not in nodes:
            nodes[nid] = _node(nid, tk, "company", company=f.get("company", tk),
                               sector=f.get("sector", ""), market_cap=f.get("market_cap"))
        sector = f.get("sector") or "Other"
        sid = f"S:{sector}"
        if sid not in nodes:
            nodes[sid] = _node(sid, sector, "sector")
        edges.append({"source": nid, "target": sid, "rel": "IN_SECTOR"})
        return f

    root = add_company(ticker)
    frontier = [p for p in (root.get("peers") or []) if p.isalpha()][:5]
    seen = {ticker}

    for d in range(max(depth, 1)):
        nxt: list[str] = []
        for peer in frontier:
            if peer in seen:
                continue
            seen.add(peer)
            pf = add_company(peer)
            edges.append({"source": f"C:{ticker}", "target": f"C:{peer}", "rel": "COMPETES_WITH"})
            if d + 1 < depth:
                nxt += [p for p in (pf.get("peers") or []) if p.isalpha() and p in SAMPLE][:3]
        frontier = nxt
        if not frontier:
            break

    # De-duplicate edges.
    uniq = {(e["source"], e["target"], e["rel"]): e for e in edges}
    graph = {"root": f"C:{ticker}", "nodes": list(nodes.values()), "edges": list(uniq.values())}

    # Best-effort persistence to Neo4j when configured (never blocks the response).
    from app.services import neo4j_store

    if neo4j_store.enabled():
        neo4j_store.sync_graph(graph)
    return graph
