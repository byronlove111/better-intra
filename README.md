*This project has been created as part of the 42 curriculum by [team — TBD].*

# BetterIntra

A modern Intra-inspired dashboard for 42. Sign in with 42, read school data (42 API), social/org features in our Postgres.

> Status: **scaffolding**. API code exists; front (Swan) and Docker/HTTPS (Ayoub) are ownership stubs.

Product scope: [`docs/cahier-des-charges.md`](docs/cahier-des-charges.md).

**Docs API (devs) :** [`apps/docs`](apps/docs/README.md) — Docusaurus (`cd apps/docs && pnpm start` → http://localhost:3000).

## Ownership

| Who | Owns |
|---|---|
| **Swan** | Frontend — [`apps/web/README.md`](apps/web/README.md) |
| **Malik** | Backend API — `apps/server` |
| **Ayoub** | Docker / HTTPS / run éval — [`docs/devops.md`](docs/devops.md) |
| **Kylian** | Recommendations scoring |

## Stack (backend today)

- **API** — Python 3.14 + UV + FastAPI + SQLAlchemy — `apps/server`
- **DB** — PostgreSQL 16
- **Web / Compose** — not in repo yet (Swan / Ayoub)

## Run with Docker (recommandé)

```bash
cp .env.example .env   # puis remplis les secrets 42 OAuth
make up
```

API en HTTPS : https://localhost:8443/docs. Détails, ports, troubleshooting : [`docs/deploiement.md`](docs/deploiement.md).

## Postgres without Docker (dev alternatif)

Si tu préfères ne pas passer par Compose, Postgres local (macOS / Homebrew) :

```bash
brew install postgresql@16
brew services start postgresql@16

createuser -s betterintra 2>/dev/null || true
psql -d postgres -c "ALTER ROLE betterintra WITH LOGIN PASSWORD 'betterintra';"
createdb -O betterintra betterintra 2>/dev/null || true
```

Matches `apps/server/.env.example` :
`postgresql+psycopg://betterintra:betterintra@localhost:5432/betterintra`

```bash
brew services stop postgresql@16   # stop when done
```

## Run the API (dev, without Docker)

```bash
cd apps/server
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

| URL | |
|---|---|
| Swagger | http://localhost:8000/docs |
| Health | http://localhost:8000/health |
| DB health | http://localhost:8000/health/db |

Front: [`apps/web/README.md`](apps/web/README.md).  
Docs API : [`apps/docs`](apps/docs/README.md) (`pnpm start` → http://localhost:3000).

## Environment

Never commit real `.env` or 42 secrets.

- `DATABASE_URL` — Postgres
- `CORS_ORIGINS` — front origin(s)
- `FORTY_TWO_*` — OAuth (later)

## Layout

```
better-intra/
├── apps/web/       # Swan
├── apps/server/    # Malik
├── docs/           # CDC, devops brief, …
└── AGENTS.md
```

### AI usage

AI assistants help with scaffolding and notes. Team reviews and owns all code before evaluation.
