<div align="center">

# 📈 AI Financial Research Agent

### Your own Bloomberg Terminal, powered by AI.

Upload filings, chat with them, run DCF valuations, ratio analysis, peer comparison,
news sentiment and portfolio analytics — all in one beautiful, dark-mode research workspace.

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![Postgres](https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-22C55E)

</div>

---

## ✨ Features

| | Feature | What it does |
|---|---|---|
| 📄 | **Filing upload & indexing** | Drop a 10-K / annual report (PDF or text). It's parsed, chunked, embedded and indexed for semantic search. |
| 💬 | **Chat with filings** | Ask questions in plain English. Answers are **grounded in the document** with page-level citations (RAG). |
| 📝 | **Earnings / filing summaries** | Auto-generated executive summary + key highlights for every uploaded document. |
| 🧮 | **DCF valuation** | Full discounted-cash-flow engine with adjustable growth, WACC, terminal growth — intrinsic value, upside %, and a sensitivity grid. |
| ⚖️ | **Ratio analysis** | Liquidity, profitability, leverage, efficiency & valuation ratios scored against benchmarks into a 0–100 health score. |
| 👥 | **Competitor comparison** | Side-by-side peer benchmarking on valuation, margins, returns and leverage with charts. |
| 📰 | **News sentiment** | Headline feed with lexicon-based sentiment scoring and an AI tape summary. |
| 💼 | **Portfolio recommendations** | Live valuation, allocation breakdown and rule-based concentration / rebalancing advice. |
| 🔐 | **Authentication** | JWT auth (register / login), per-user data isolation. |

> **Zero-config demo mode:** every feature works out of the box with **no API keys** and **no Postgres** — the app falls back to SQLite, a local embedding model, deterministic analyst text and a curated sample dataset. Add keys to go fully live.

---

## 🧱 Tech stack

**Frontend** — React 18 · TypeScript · Vite · Tailwind CSS · Recharts · React Router · Lucide icons
**Backend** — FastAPI · SQLAlchemy 2 · Pydantic v2 · JWT (python-jose + passlib)
**AI** — Provider-agnostic LLM layer (**Anthropic Claude** / **OpenAI**) · RAG · vector similarity search
**Data** — PostgreSQL + pgvector (prod) / SQLite (dev) · yfinance · NewsAPI (optional)
**Infra** — Docker & docker-compose · Nginx · GitHub Actions CI

---

## 🏗️ Architecture

```
┌─────────────────┐     REST / JWT      ┌──────────────────────┐
│  React + Vite   │ ──────────────────► │   FastAPI backend    │
│  (Nginx in prod)│ ◄────────────────── │                      │
└─────────────────┘                     │  ├─ auth (JWT)       │
                                        │  ├─ documents (RAG)  │
                                        │  ├─ chat             │
                                        │  ├─ valuation (DCF)  │
                                        │  ├─ ratios           │
   ┌───────────────┐                    │  ├─ competitors      │
   │ LLM provider  │ ◄───── services ───┤  ├─ sentiment        │
   │ Claude/OpenAI │                    │  └─ portfolio        │
   └───────────────┘                    └──────────┬───────────┘
                                                   │ SQLAlchemy
                                        ┌──────────▼───────────┐
                                        │ PostgreSQL + pgvector │
                                        │   (or SQLite in dev)  │
                                        └──────────────────────┘
```

---

## 🚀 Quickstart

### Option A — Local (no Docker, no keys)

**1. Backend**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed          # creates demo@fra.ai / demo12345 + a sample portfolio
uvicorn app.main:app --reload --port 8000
```
API docs at **http://localhost:8000/docs**

**2. Frontend** (new terminal)
```bash
cd frontend
npm install
npm run dev
```
App at **http://localhost:5173** — log in with **demo@fra.ai / demo12345**.

### Option B — Docker (full stack: Postgres + pgvector + API + web)

```bash
cp .env.example .env        # optional: add your API keys
docker compose up --build
```
- Web → http://localhost:5173
- API → http://localhost:8000/docs

> The repo also ships a `Makefile`: `make install`, `make backend`, `make frontend`, `make seed`, `make test`, `make docker-up`.

---

## 🔑 Configuration

Copy `.env.example` → `.env`. Key variables:

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./financial_agent.db` | Swap for Postgres in prod |
| `SECRET_KEY` | _change me_ | `openssl rand -hex 32` |
| `LLM_PROVIDER` | `demo` | `anthropic` · `openai` · `demo` |
| `ANTHROPIC_API_KEY` | — | enables Claude (`claude-sonnet-4-6`) |
| `OPENAI_API_KEY` | — | enables GPT + OpenAI embeddings |
| `NEWSAPI_KEY` | — | live news; falls back to samples |
| `VITE_API_URL` | `http://localhost:8000` | frontend → backend URL |

If no LLM key is set, the app runs in **demo mode** with deterministic analyst-style output. If no OpenAI key is set, a built-in local hashing embedding powers semantic search.

---

## 🧪 Tests

```bash
cd backend && source .venv/bin/activate
pytest -q
```
Covers the DCF math, ratio computations, auth flow, filing upload + RAG chat, and every analytics endpoint.

---

## 📡 API overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` · `/api/auth/login` | Auth |
| `GET/POST/DELETE` | `/api/documents` | Upload & manage filings |
| `POST` | `/api/chat/ask` | Grounded Q&A with citations |
| `POST` | `/api/valuation/dcf` | DCF valuation (+ `/sensitivity`) |
| `POST` | `/api/ratios` | Ratio analysis + health score |
| `POST` | `/api/competitors` | Peer comparison |
| `POST` | `/api/sentiment` | News sentiment |
| `GET/POST` | `/api/portfolio/*` | Holdings & recommendations |

Full interactive docs (Swagger UI) at `/docs`.

---

## ☁️ Deployment

- **Backend** → any container host (AWS ECS/Fargate, Fly.io, Render, Railway). Set `DATABASE_URL` to a managed Postgres (RDS) with the `pgvector` extension, plus `SECRET_KEY` and your LLM key.
- **Frontend** → static host (S3 + CloudFront, Vercel, Netlify) — build with `VITE_API_URL` pointing at the API. The provided multi-stage `Dockerfile` serves it via Nginx.
- **CI** → GitHub Actions runs backend tests + frontend build on every push (`.github/workflows/ci.yml`).

---

## ⚠️ Disclaimer

This project is for **educational and research purposes only**. Nothing here is financial advice.
Valuations, ratios and recommendations are model outputs — always do your own due diligence.

## 📄 License

MIT © Akshat Gupta
