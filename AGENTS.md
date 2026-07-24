<!-- intent-skills:start -->
## Skill Loading (TanStack — run from `apps/web/`)

Before editing frontend files for a substantial task:
- Run `pnpm dlx @tanstack/intent@latest list` from `apps/web/` to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Prefer the most specific local skill for the package or concern you are changing.
<!-- intent-skills:end -->

# BetterIntra — Agent Context

Modern Intra-like dashboard for 42: read from the official 42 API (OAuth), write social/org features to our own PostgreSQL.

Product scope: `docs/cahier-des-charges.md` (18 pts target).

## Scaffold commands used

```bash
# Frontend (scratch then moved to apps/web/)
npx @tanstack/cli@latest create my-tanstack-app --agent --package-manager pnpm --tailwind
# Note: --tailwind flag is deprecated/ignored; Tailwind is already in the blank Start scaffold.

# Then from apps/web/
npx @tanstack/intent@latest install
npx @tanstack/intent@latest list

# Backend (then moved to apps/server/)
uv python install 3.14
cd apps/server && uv init --name better-intra-api --python 3.14
uv add "fastapi[standard]" "sqlalchemy>=2" "psycopg[binary]" alembic pydantic-settings python-dotenv
```

Follow-up Intent loads already used for setup decisions:
- `@tanstack/start-client-core#start-core`
- `@tanstack/start-client-core#start-core/deployment` (Nitro for Node/Docker)
- `@tanstack/react-start#react-start`

## Stack

| Layer | Choice |
|---|---|
| Frontend | TanStack Start (React 19) + Tailwind CSS 4 + pnpm |
| Frontend deploy | Nitro (`nitro/vite`) → `node .output/server/index.mjs` |
| Backend | Python **3.14** + **UV** + **FastAPI** + **SQLAlchemy 2** + Alembic |
| Database | PostgreSQL 16 |
| Containers | Docker Compose: `web` + `api` + `db` |

## Repo layout

```
better-intra/
  apps/
    web/                # TanStack Start app
    server/             # FastAPI app (package: app/)
  docs/                 # subject, API notes, cahier des charges
  docker-compose.yml
  .env.example
  AGENTS.md
```

## Environment variables

Copy examples before running:

```bash
cp .env.example .env
cp apps/server/.env.example apps/server/.env
```

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | apps/server | SQLAlchemy URL (`postgresql+psycopg://...`) |
| `CORS_ORIGINS` | apps/server | Comma-separated allowed origins |
| `ENVIRONMENT` | apps/server | `development` / `production` |
| `VITE_API_URL` | apps/web / compose | Public API base URL for the browser |
| `FORTY_TWO_CLIENT_ID` | apps/server (later) | 42 OAuth app id |
| `FORTY_TWO_CLIENT_SECRET` | apps/server (later) | 42 OAuth secret — never commit |
| `FORTY_TWO_REDIRECT_URI` | apps/server (later) | OAuth callback URL |

## Local development (without Docker)

```bash
# Terminal 1 — Postgres (or use compose db only)
docker compose up db -d

# Terminal 2 — API
cd apps/server
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 3 — Web
cd apps/web
pnpm install
pnpm dev
```

- Web: http://localhost:3000  
- API: http://localhost:8000  
- API docs: http://localhost:8000/docs  
- Health: `GET /health`, `GET /health/db` (needs Postgres)

## Docker (single command — subject requirement)

```bash
cp apps/server/.env.example apps/server/.env   # if missing
docker compose up --build
```

Services:
- `web` → :3000 (TanStack Start / Nitro)
- `api` → :8000 (FastAPI / Uvicorn)
- `db` → :5432 (Postgres)

## Architectural decisions

1. **Split FE/BE under `apps/`**: `apps/web` (TanStack Start) + `apps/server` (FastAPI). FastAPI owns auth tokens, 42 API proxy, DB writes, WebSockets later. No 42 secrets in the browser.
2. **Blank Start scaffold preserved**: CLI structure kept; Nitro added only for Node/Docker hosting (Intent deployment skill).
3. **SQLAlchemy + Alembic installed**, no models/migrations yet (setup only).
4. **Health endpoints only** on the API for now — no feature implementation.
5. **Devtools Vite plugin stays first** in `apps/web/vite.config.ts` (Intent requirement).

## Known gotchas

- TanStack Start code is **isomorphic by default** — use `createServerFn` for server-only logic; do not invent Next.js patterns.
- Do **not** enable `verbatimModuleSyntax` in the frontend tsconfig (server/client bundle leak risk).
- `vite.config.ts` plugin order: `devtools()` → `tailwindcss()` → `tanstackStart()` → `nitro()` → `viteReact()`.
- Python **3.14** via UV; Docker API image uses `ghcr.io/astral-sh/uv:python3.14-bookworm-slim`.
- Compose `api` expects `apps/server/.env` to exist (copy from `.env.example`).
- Writing to the real 42 API is **out of scope** — read-only + our DB for writes.

## Next steps (not done yet)

1. OAuth 42 login flow (server) + session/JWT
2. User cache table + SQLAlchemy models / Alembic migrations
3. Proxy read endpoints (profile, projects, events, scale_teams, locations)
4. Slots CRUD + public API module
5. Friends, chat DM, WebSockets notifications
6. Analytics / PDF / gamification per cahier des charges
7. HTTPS termination for evaluation (reverse proxy / Traefik / Caddy)
8. Privacy Policy + Terms of Service pages
