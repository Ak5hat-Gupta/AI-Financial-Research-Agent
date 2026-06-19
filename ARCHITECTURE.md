# Atlas — Architecture

This document describes the target architecture for Atlas and the phased plan by
which the platform is being built. It is the reference for how the codebase is
organised and why.

## Principles

- **Clean Architecture.** Dependencies point inwards. The API layer depends on
  services; services depend on repositories and domain models; nothing in the core
  depends on FastAPI or SQLAlchemy details leaking outward.
- **Explicit boundaries.** Persistence lives behind repositories. Language-model
  access lives behind a provider-agnostic service. Swapping an implementation does
  not ripple through the application.
- **Graceful degradation.** Every external dependency (LLM provider, Redis, market
  data, news) has a deterministic offline fallback so the system is fully runnable
  with no credentials.
- **Observability first.** Every request carries a correlation id; logs are
  structured; health reports dependency readiness.

## Layered layout (backend)

```
app/
├── main.py            # composition root: middleware, routers, lifespan
├── api/
│   └── v1/            # versioned API surface (aggregator -> feature routers)
├── core/              # config, database, security, logging, cache, middleware
├── repositories/      # data access; SQLAlchemy confined here
├── services/          # business logic (RAG pipeline, valuation, ratios, …)
├── schemas/           # Pydantic request/response contracts
└── models/            # ORM entities
```

Request flow:

```
HTTP → middleware (request id, rate limit) → API v1 router → service → repository → DB
                                                          ↘ cache / LLM / market data
```

## AI pipeline

Atlas does not send raw user input straight to a model. Retrieval-augmented
answers follow an explicit, inspectable pipeline:

```
query → intent detection → retrieval → reranking → context builder
      → LLM → citation verification → response (+ citations)
```

The current implementation covers retrieval, context building, generation, and
citation capture; intent detection, reranking, and a verification pass are being
hardened as the AI Research workspace matures.

## Persistence strategy (polyglot)

| Store | Role | Status |
|---|---|---|
| PostgreSQL + pgvector | Relational data and embeddings | Active (SQLite in dev) |
| Redis | Cache, sessions, rate-limit windows | Active (in-process fallback) |
| Neo4j | Knowledge graph (companies, people, supply chains) | Phase 3 |
| Qdrant | Dedicated vector search at scale | Phase 3 |

## Delivery phases

- **Phase 0 — Foundation.** Clean Architecture skeleton, API versioning, Redis
  cache, structured logging, request correlation, rate limiting, richer health,
  Compose with Postgres + Redis, CI. *(in progress)*
- **Phase 1 — Core loop.** Company dashboard, document intelligence
  (upload → parse → embed → index → semantic search), and the three-panel cited
  AI research workspace.
- **Phase 2 — Analysis.** Institutional investment-memo generator (10 sections,
  rating + target, PDF export) composing fundamentals, ratios, DCF, comps and
  sentiment. *(shipped)* Competitor benchmarking and DCF are live; a DCF
  sensitivity surface is the remaining item.
- **Phase 3 — Intelligence.** *(shipped)* Earnings-call analysis (tone,
  management confidence, topic frequency) and an interactive knowledge graph
  (company / sector / peer; Neo4j-ready node-edge shape, derived in-process
  offline). News sentiment ships from Phase 1.
- **Phase 4 — Platform.** *(shipped)* OAuth (Google, GitHub; feature-flagged),
  watchlists with daily-update notifications, dependency-aware health, structured
  logging, and deployment artifacts (Compose, `render.yaml`, `fly.toml`,
  `DEPLOY.md`). Background workers remain a future hardening item.

## Frontend

The web client is migrating to Next.js (App Router) with TypeScript, Tailwind,
shadcn/ui, TanStack Query, Zustand, and Framer Motion — a command-palette-driven,
information-dense interface modelled on Linear, Stripe, and Bloomberg.
