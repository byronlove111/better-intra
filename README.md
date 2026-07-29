*This project has been created as part of the 42 curriculum by [team — TBD].*

# BetterIntra

A modern Intra-inspired dashboard for 42. You sign in with your real 42 account, browse your real school data (read-only from the 42 API), and use social / organisational features stored in our own database (slots, friends, chat, notifications, etc.).

> Status: **scaffolding only**. Stack and Docker are ready; product features (OAuth, profile, …) are not implemented yet.

Full product scope: [`docs/cahier-des-charges.md`](docs/cahier-des-charges.md).

## Stack

- **Web** — React + Vite SPA + TanStack Router + TanStack Query + Zod + Zustand + shadcn — `apps/web`
- **API** — Python 3.14 + UV + FastAPI + SQLAlchemy — `apps/server`
- **DB** — PostgreSQL 16
- **Run** — Docker Compose (`web` · `api` · `db`)

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose v2)
- For local hybrid dev only: [Node.js 22+](https://nodejs.org/), [pnpm](https://pnpm.io/), [UV](https://docs.astral.sh/uv/)

## Quick start (Docker — recommended)

One command launches the whole stack.

```bash
# from the repo root
cp apps/server/.env.example apps/server/.env

docker compose up --build
```

Then open:

| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| API docs (Swagger) | http://localhost:8000/docs |
| API health | http://localhost:8000/health |
| DB health | http://localhost:8000/health/db |

Stop everything:

```bash
docker compose down
```

Useful Compose commands:

```bash
docker compose ps              # running services
docker compose logs -f         # all logs
docker compose logs -f web     # web only
docker compose logs -f api     # api only
docker compose up --build -d   # background mode
```

## Local development (hybrid)

Best for day-to-day coding: Postgres in Docker, API and web on the host (hot reload).

```bash
# 1) Database
docker compose up db -d

# 2) API
cp apps/server/.env.example apps/server/.env
cd apps/server
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3) Web (other terminal)
cd apps/web
pnpm install
pnpm dev
```

Same URLs as above (`:3000` / `:8000`).

## Environment

| File | Role |
|---|---|
| `.env.example` | Root / shared hints |
| `apps/server/.env.example` | API settings (copy to `apps/server/.env`) |

Never commit real `.env` files or 42 OAuth secrets.

Main variables:

- `DATABASE_URL` — Postgres connection (SQLAlchemy / psycopg)
- `CORS_ORIGINS` — allowed front origins
- `VITE_API_URL` — API URL exposed to the browser
- `FORTY_TWO_*` — OAuth (wired later)

## Project layout

```
better-intra/
├── apps/
│   ├── web/          # React + Vite SPA
│   └── server/       # FastAPI backend
├── docs/             # Subject, API notes, specs
├── docker-compose.yml
└── AGENTS.md         # Dev / agent context
```

Front layering: [`apps/web/ARCHITECTURE.md`](apps/web/ARCHITECTURE.md).

## Resources

- [42 API](https://api.intra.42.fr/apidoc) — see also `docs/doc-api42.txt`
- [TanStack Router](https://tanstack.com/router)
- [TanStack Query](https://tanstack.com/query)
- [FastAPI](https://fastapi.tiangolo.com/)
- [UV](https://docs.astral.sh/uv/)
- [Docker Compose](https://docs.docker.com/compose/)

### AI usage

AI assistants are used for scaffolding, architecture notes, and boilerplate. All generated code is reviewed and owned by the team before evaluation.
