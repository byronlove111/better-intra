# BetterIntra — Agent Context

Modern Intra-like dashboard for 42: read from the official 42 API (OAuth), write social/org features to our own PostgreSQL.

Product scope: `docs/cahier-des-charges.md` (18 pts target).

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
3. SQLAlchemy + Alembic installed; no models yet.
4. API exposes `/health` + `/health/db` only for now.

## Next steps

1. Push remaining local proxy 42 work (if not merged)
2. Friends (CRUD)
3. Profile bio (JWT) + **public API profiles** (API key, rate limit, OpenAPI) — Major +2
4. Chat DM + WebSockets (online, messages, notifs)
5. Notifications persistées
6. Analytics logtime + export PDF/CSV
7. Peer recommendations
8. HTTPS + Compose (Ayoub)
9. Privacy Policy + Terms of Service + i18n (Swan)
