# BetterIntra — Agent Context

Modern Intra-like dashboard for 42: read from the official 42 API (OAuth), write social/org features to our own PostgreSQL.

Product scope: `docs/cahier-des-charges.md` (18 pts target).

Docs API (Docusaurus) : `apps/docs` (`pnpm start` → http://localhost:3000).

## Stack

| Layer | Choice |
|---|---|
| Frontend | **Swan** — empty `apps/web/` + API connection README |
| Backend | Python **3.14** + **UV** + **FastAPI** + **SQLAlchemy 2** + Alembic |
| Database | PostgreSQL 16 |
| Containers / HTTPS | **Ayoub** — see `docs/devops.md` (no Compose in repo yet) |

## Repo layout

```
better-intra/
  apps/
    web/                # Swan
    server/             # FastAPI (Malik)
  docs/
    devops.md           # Ayoub brief
  AGENTS.md
```

## Environment variables

```bash
cp apps/server/.env.example apps/server/.env
```

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | apps/server | SQLAlchemy URL |
| `CORS_ORIGINS` | apps/server | Allowed front origins |
| `FORTY_TWO_*` | apps/server (later) | OAuth 42 |

## Local development (API, no Docker)

### Postgres (Homebrew, until Compose exists)

```bash
brew install postgresql@16
brew services start postgresql@16

createuser -s betterintra 2>/dev/null || true
psql -d postgres -c "ALTER ROLE betterintra WITH LOGIN PASSWORD 'betterintra';"
createdb -O betterintra betterintra 2>/dev/null || true
```

`DATABASE_URL` = `postgresql+psycopg://betterintra:betterintra@localhost:5432/betterintra`

### API

```bash
cd apps/server
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API: http://localhost:8000/docs  
- Front: `apps/web/README.md`  
- Docker / HTTPS: `docs/devops.md`

## Architectural decisions

1. Backend owns secrets, 42 proxy, DB access. Front never talks to api.intra.42.fr.
2. Front stack = Swan. Docker/HTTPS = Ayoub.
3. Intra-first identity (`intra_people`) + follows; unified profiles; BetterIntra **events** + per-user **API keys**.
4. Public API Major = `/api/v1/events` with `X-API-Key` (+ rate limit); front JWT `/events` = unified feed + BI CRUD.
5. Event list merge = Intra + BetterIntra via pluggable source adapters (`app/agenda`).
6. Chat DM: 1 thread/pair, Intra-linked only, last-read + blocks; WS `/ws?token=` for message/read/presence (no typing).
7. Logtime analytics: `GET /analytics/logtime` + CSV/PDF export.
8. Notifications: simple inbox (type/body/url/date), 7-day TTL, WS `notification.created`.

## Next steps

1. Peer recommendations
2. HTTPS + Compose (Ayoub)
3. Privacy Policy + Terms of Service + i18n (Swan)
