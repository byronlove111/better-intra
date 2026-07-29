# BetterIntra — Agent Context

Modern Intra-like dashboard for 42: read from the official 42 API (OAuth), write social/org features to our own PostgreSQL.

Product scope: `docs/cahier-des-charges.md` (18 pts target).

## Stack

| Layer | Choice |
|---|---|
| Frontend | **React 19 + Vite** SPA + **TanStack Router** + **TanStack Query** + **Zod** + **Zustand** + Tailwind 4 + shadcn |
| Frontend deploy | static `dist/` served by **nginx** |
| Backend | Python **3.14** + **UV** + **FastAPI** + **SQLAlchemy 2** + Alembic |
| Database | PostgreSQL 16 |
| Containers | Docker Compose: `web` + `api` + `db` |

## Repo layout

```
better-intra/
  apps/
    web/                # React + Vite SPA
    server/             # FastAPI app (package: app/)
  docs/
  docker-compose.yml
  AGENTS.md
```

## Environment variables

```bash
cp .env.example .env
cp apps/server/.env.example apps/server/.env
```

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | apps/server | SQLAlchemy URL |
| `CORS_ORIGINS` | apps/server | Allowed front origins |
| `VITE_API_URL` | apps/web (build-time) | Public API URL for the browser |
| `FORTY_TWO_*` | apps/server (later) | OAuth 42 |

## Local development

```bash
docker compose up db -d

cd apps/server
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

cd apps/web
pnpm install
pnpm dev
```

- Web: http://localhost:3000  
- API: http://localhost:8000/docs  

## Docker

```bash
cp apps/server/.env.example apps/server/.env
docker compose up --build
```

## Architectural decisions

1. **SPA front + FastAPI backend** — no TanStack Start / no front-side server runtime. Backend owns secrets, 42 API proxy, DB, WebSockets later.
2. **TanStack Query** for server state on top of `lib/api` fetch helpers (+ Zod parse).
3. **TanStack Router** file routes; pages stay thin (`route` → `page` → `hook` → `lib/api`).
4. **Zustand** for client UI state only (e.g. theme).
5. **Design tokens** only in `apps/web/src/styles.css` (tweakcn). Never hardcode colors in JSX.
6. **SQLAlchemy + Alembic** installed; no models yet.
7. API currently exposes `/health` + `/health/db` only.

## Known gotchas

- `VITE_*` vars are baked at **build** time for the web image.
- Compose `api` needs `apps/server/.env`.
- Do not write to the real 42 API — read-only + our DB.

## Next steps

1. OAuth 42 + session/JWT  
2. Models / Alembic migrations  
3. Proxy profile / projects / events  
4. Slots CRUD + public API  
5. Friends, chat, WebSockets  
6. Analytics / PDF / gamification  
7. HTTPS for evaluation  
8. Privacy Policy + Terms of Service
