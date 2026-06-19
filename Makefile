.PHONY: help install backend web dev test seed docker-up docker-down

help:
	@echo "Atlas — common commands"
	@echo ""
	@echo "  make install      Install backend + web dependencies"
	@echo "  make backend      Run FastAPI dev server (http://localhost:8000)"
	@echo "  make web          Run Next.js dev server (http://localhost:3000)"
	@echo "  make seed         Seed the database with a demo user + sample data"
	@echo "  make test         Run backend test suite"
	@echo "  make docker-up    Build & start full stack (db + redis + api + web)"
	@echo "  make docker-down  Stop the Docker stack"

install:
	cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
	cd web && npm install

backend:
	cd backend && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000

web:
	cd web && npm run dev

seed:
	cd backend && . .venv/bin/activate && python -m app.seed

migrate:
	cd backend && . .venv/bin/activate && alembic upgrade head

worker:
	cd backend && . .venv/bin/activate && python worker.py

test:
	cd backend && . .venv/bin/activate && pytest -q

docker-up:
	docker compose up --build

docker-down:
	docker compose down
