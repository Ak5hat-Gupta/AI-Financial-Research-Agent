# Deploying Atlas

Atlas is a stateless API plus a static/standalone web client and three backing
services (PostgreSQL + pgvector, Redis, and optionally a managed LLM/news/OAuth
provider). It runs anywhere containers run.

## Environment

Set these in production (see `.env.example` for the full list):

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Managed Postgres with the `pgvector` extension enabled |
| `REDIS_URL` | Managed Redis (cache, sessions, rate-limit windows) |
| `SECRET_KEY` | `openssl rand -hex 32` |
| `ENVIRONMENT` | `production` |
| `CORS_ORIGINS` | Your web origin(s) |
| `LLM_PROVIDER` + key | `anthropic` or `openai` for live inference (optional) |
| `GOOGLE_/GITHUB_CLIENT_*` | Enable OAuth (optional) |
| `NEXT_PUBLIC_API_URL` | Public API URL, baked into the web build |

## Option A — Docker Compose (single host / VM)

```bash
cp .env.example .env   # fill in secrets
docker compose up --build -d
```

Brings up `db`, `redis`, `backend` (:8000) and `web` (:3000). Put a reverse
proxy (Caddy/Nginx/ALB) in front for TLS.

## Option B — Managed platforms

- **Backend** → AWS ECS/Fargate, Fly.io, Render, or Railway. Build `backend/`,
  run `uvicorn app.main:app --host 0.0.0.0 --port 8000`. Attach RDS Postgres
  (pgvector) and ElastiCache/Upstash Redis. `render.yaml` and `fly.toml` are
  provided as starting points.
- **Web** → Vercel/Netlify (Next.js native) or the bundled standalone Docker
  image. Set `NEXT_PUBLIC_API_URL` at build time.

## Migrations

The schema is created on startup via SQLAlchemy `create_all`. For evolving
production schemas, introduce Alembic before the first release.

## Health & observability

- `GET /health` reports database, cache and LLM-provider readiness.
- Logs are structured JSON with a per-request `x-request-id`; ship stdout to your
  aggregator (CloudWatch, Loki, Datadog).
