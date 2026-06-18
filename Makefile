.PHONY: help install backend frontend dev test seed docker-up docker-down lint

help:
	@echo "AI Financial Research Agent — common commands"
	@echo ""
	@echo "  make install      Install backend + frontend dependencies"
	@echo "  make backend      Run FastAPI dev server (http://localhost:8000)"
	@echo "  make frontend     Run Vite dev server (http://localhost:5173)"
	@echo "  make seed         Seed the database with a demo user + sample data"
	@echo "  make test         Run backend test suite"
	@echo "  make docker-up    Build & start full stack (db + api + web) via Docker"
	@echo "  make docker-down  Stop the Docker stack"

install:
	cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
	cd frontend && npm install

backend:
	cd backend && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

seed:
	cd backend && . .venv/bin/activate && python -m app.seed

test:
	cd backend && . .venv/bin/activate && pytest -q

docker-up:
	docker compose up --build

docker-down:
	docker compose down
