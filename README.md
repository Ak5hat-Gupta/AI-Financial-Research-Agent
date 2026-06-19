# AI Financial Research Agent

A full-stack equity research platform that combines retrieval-augmented document
analysis with a deterministic quantitative engine. Analysts can upload regulatory
filings and interrogate them in natural language with source-cited answers, then
run discounted cash-flow models, ratio diagnostics, peer benchmarking, news
sentiment, and portfolio analytics from a single workspace.

<p>
  <img alt="Python"     src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white">
  <img alt="FastAPI"    src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white">
  <img alt="React"      src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white">
  <img alt="Docker"     src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white">
  <img alt="License"    src="https://img.shields.io/badge/License-MIT-22C55E">
</p>

## Overview

The platform is organised around two complementary disciplines.

**Document intelligence.** Filings such as 10-Ks, 10-Qs, and annual reports are
parsed, segmented into overlapping passages, embedded, and indexed for semantic
retrieval. Questions are answered strictly from the indexed text, and every
response carries page-level citations so that each assertion remains traceable to
its source. This constraint is deliberate: it prevents the model from speculating
beyond the document and keeps the analysis defensible.

**Quantitative analysis.** A deterministic finance engine computes intrinsic value
through a discounted cash-flow model (with terminal value and a two-dimensional
sensitivity surface), evaluates a battery of liquidity, profitability, leverage,
and valuation ratios against rule-of-thumb benchmarks, benchmarks a company against
its peers, and surfaces concentration and rebalancing signals across a portfolio.

The system is engineered to operate end-to-end without external dependencies. In
the absence of a language-model provider or a database server, it degrades
gracefully to SQLite, a local embedding model, and a curated reference dataset,
preserving full functionality for evaluation. Supplying API credentials promotes
it to live inference and market data without any code change.

## Capabilities

| Domain | Description |
|---|---|
| Filing ingestion | Parses PDF and text filings, segments them into citable passages, embeds each passage, and persists the index. |
| Conversational analysis | Answers questions against the indexed corpus using retrieval-augmented generation, returning page-level citations for provenance. |
| Filing summaries | Produces an executive summary and a set of salient highlights for each uploaded document. |
| Intrinsic valuation | A discounted cash-flow model with configurable growth, discount rate, and terminal growth, plus a WACC × terminal-growth sensitivity grid. |
| Ratio diagnostics | Computes liquidity, profitability, leverage, efficiency, and valuation ratios and consolidates them into a 0–100 financial-health score. |
| Peer benchmarking | Compares a target against its peers across valuation multiples, margins, returns, and leverage. |
| News sentiment | Aggregates recent headlines and scores tone with a transparent lexicon, accompanied by a narrative summary. |
| Investment memos | Composes an institutional, ten-section memo with a Buy/Hold/Sell rating, price target, and one-click PDF export. |
| Earnings-call analysis | Scores tone, estimates management confidence, and ranks discussed topics from a transcript. |
| Knowledge graph | Interactive company / sector / peer graph (Neo4j-ready), explorable by hops. |
| Portfolio analytics | Marks holdings to market, derives allocation and return, and issues rule-based concentration and rebalancing guidance. |
| Watchlist & alerts | Tracked tickers with generated daily-update notifications. |
| Authentication | Stateless JWT plus optional Google / GitHub OAuth; per-user data isolation. |

## Architecture

```
┌──────────────────┐      HTTPS / JWT       ┌─────────────────────────┐
│  React + Vite    │ ─────────────────────► │     FastAPI service     │
│  (Nginx in prod) │ ◄───────────────────── │                         │
└──────────────────┘                        │  auth · documents       │
                                            │  chat · valuation       │
        ┌────────────────────┐              │  ratios · competitors   │
        │  LLM provider       │ ◄── service ─┤  sentiment · portfolio  │
        │  (Anthropic/OpenAI) │   layer      └────────────┬────────────┘
        └────────────────────┘                           │ SQLAlchemy
                                              ┌───────────▼────────────┐
                                              │  PostgreSQL + pgvector  │
                                              │   (SQLite in dev)       │
                                              └─────────────────────────┘
```

The backend exposes a versioned REST API. A provider-agnostic service layer
abstracts language-model access behind a single interface, so the same code path
serves Anthropic, OpenAI, or the offline fallback. Persistence is handled through
SQLAlchemy, allowing the identical schema to run on SQLite during development and
PostgreSQL with `pgvector` in production. The web client is a Next.js (App Router)
application with a command-palette-driven, information-dense interface.

## Technology

- **Backend** — FastAPI, SQLAlchemy 2, Pydantic v2, JWT (python-jose, passlib),
  repository-pattern data access, Redis cache, structured logging.
- **Frontend** — Next.js 14 (App Router), TypeScript, Tailwind CSS, TanStack
  Query, Zustand, Framer Motion, Recharts, and a ⌘K command palette.
- **Data and AI** — PostgreSQL with `pgvector` (SQLite in development), Redis, a
  retrieval-augmented pipeline, and a provider-agnostic LLM layer.
- **Market and news data** — yfinance and an optional news provider, each with a
  deterministic offline fallback.
- **Infrastructure** — Docker Compose, GitHub Actions CI, structured logging.

## Getting started

### Prerequisites

Python 3.12+ and Node.js 20+. Docker is optional and only required for the
containerised workflow.

### Local development

Start the API:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

The interactive API documentation is then available at `http://localhost:8000/docs`.

In a separate terminal, start the web client (Next.js):

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000` and sign in with the seeded account
(`demo@fra.ai` / `demo12345`). Tip: press `⌘K` / `Ctrl+K` anywhere for the
command palette.

### Containerised deployment

```bash
cp .env.example .env   # optionally add provider credentials
docker compose up --build
```

This provisions PostgreSQL with `pgvector`, the API, and the web client. A
`Makefile` provides equivalent shortcuts: `make install`, `make backend`,
`make frontend`, `make seed`, `make test`, and `make docker-up`.

## Configuration

Configuration is read from environment variables; copy `.env.example` to `.env`
to begin. The most relevant settings are:

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | SQLite | Connection string; use PostgreSQL in production. |
| `SECRET_KEY` | placeholder | JWT signing secret (`openssl rand -hex 32`). |
| `LLM_PROVIDER` | `demo` | Selects `anthropic`, `openai`, or the offline fallback. |
| `ANTHROPIC_API_KEY` | — | Enables Anthropic inference. |
| `OPENAI_API_KEY` | — | Enables OpenAI inference and embeddings. |
| `NEWSAPI_KEY` | — | Enables live news retrieval; otherwise sample data is used. |
| `VITE_API_URL` | `http://localhost:8000` | API base URL consumed by the client. |

When no provider key is configured, the application runs in its offline mode with
deterministic output. When no embedding provider is available, a local embedding
model powers semantic retrieval.

## Testing

```bash
cd backend
source .venv/bin/activate
pytest
```

The suite covers the valuation mathematics, ratio computations, the authentication
flow, filing ingestion with retrieval-augmented chat, and each analytical endpoint.

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register`, `/api/auth/login` | Account creation and authentication. |
| `GET`, `POST`, `DELETE` | `/api/documents` | Filing management. |
| `POST` | `/api/chat/ask` | Cited question answering over filings. |
| `POST` | `/api/valuation/dcf` | Discounted cash-flow valuation and sensitivity. |
| `POST` | `/api/ratios` | Ratio analysis and health score. |
| `POST` | `/api/competitors` | Peer benchmarking. |
| `POST` | `/api/sentiment` | News sentiment analysis. |
| `GET`, `POST` | `/api/portfolio/*` | Holdings and recommendations. |

Complete, interactive documentation is available at `/docs`.

## Deployment

The backend is a stateless container suitable for any orchestrator (for example
AWS ECS or Fargate, Fly.io, Render, or Railway). In production, point
`DATABASE_URL` at a managed PostgreSQL instance with the `pgvector` extension
enabled and provide `SECRET_KEY` and the relevant provider credentials. The
frontend compiles to static assets that can be served from a CDN or the bundled
Nginx image; build it with `VITE_API_URL` set to the public API address.
Continuous integration runs the backend test suite and a production build of the
client on every push.

## Disclaimer

This project is intended for educational and research purposes. It does not
constitute financial advice. All valuations, ratios, and recommendations are model
outputs and should be independently verified before any decision is made.

## License

Released under the MIT License. Copyright © 2026 Akshat Gupta.
