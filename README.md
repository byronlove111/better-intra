*This project has been created as part of the 42 curriculum by [team DBF].*

# BetterIntra

A modern Intra-inspired dashboard for 42. Sign in with 42, read school data (42 API), social/org features in our Postgres.

Product scope: [`docs/cahier-des-charges.md`](docs/cahier-des-charges.md).

## Ownership

| Who | Owns |
|---|---|
| **Swan** | Frontend — [`apps/web`](apps/web) |
| **Malik** | Backend API — [`apps/server`](apps/server) |
| **Ayoub** | Docker / HTTPS / run éval — [`docs/devops.md`](docs/devops.md) |
| **Kylian** | Recommendations scoring |

## Quick links (dev local)

| Quoi | URL | Comment démarrer |
|---|---|---|
| **Swagger** (OpenAPI) | http://localhost:8000/docs | API allumée (voir ci-dessous) |
| **ReDoc** | http://localhost:8000/redoc | idem |
| **Health** | http://localhost:8000/health | idem |
| **Docs développeur** (Docusaurus) | http://localhost:3001 | `cd apps/docs && pnpm install && pnpm exec docusaurus start --port 3001` |
| **Preview front** (api-lab, pas Swan) | http://localhost:5174 | `cd apps/api-lab && pnpm install && pnpm dev` |
| **Front officiel** (Swan) | — | [`apps/web`](apps/web) |

En Docker / HTTPS : Swagger sur https://localhost:8443/docs — détails dans [`docs/deploiement.md`](docs/deploiement.md).

## Stack

- **API** — Python 3.14 + UV + FastAPI + SQLAlchemy — `apps/server`
- **DB** — PostgreSQL 16
- **Docs API** — Docusaurus — `apps/docs`
- **Preview UI** — Vite + React — `apps/api-lab` (smoke / démo, pas le front de rendu)
- **Web officiel** — `apps/web` (Swan)

## Run with Docker (recommandé)

```bash
cp .env.example .env   # puis remplis les secrets 42 OAuth
make up
```

API en HTTPS : https://localhost:8443/docs. Détails, ports, troubleshooting : [`docs/deploiement.md`](docs/deploiement.md).

## Postgres without Docker (dev alternatif)

```bash
brew install postgresql@16
brew services start postgresql@16

createuser -s betterintra 2>/dev/null || true
psql -d postgres -c "ALTER ROLE betterintra WITH LOGIN PASSWORD 'betterintra';"
createdb -O betterintra betterintra 2>/dev/null || true
```

`DATABASE_URL` (cf. `apps/server/.env.example`) :
`postgresql+psycopg://betterintra:betterintra@localhost:5432/betterintra`

## Run the API (dev, without Docker)

```bash
cd apps/server
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Puis ouvre **Swagger** : http://localhost:8000/docs

## Docs développeur (Docusaurus)

Guides FR pour brancher le front / clients sur l’API (auth, Intra, events, chat, analytics…).

```bash
cd apps/docs
pnpm install
pnpm exec docusaurus start --port 3001
```

→ http://localhost:3001

(`pnpm start` sans port utilise 3000 par défaut — à éviter si le front web tourne déjà dessus.)

Plus de détail : [`apps/docs/README.md`](apps/docs/README.md).

## Preview front (api-lab)

UI jetable qui consomme toute l’API (login, dashboard, chat/WS, etc.). Utile pour smoke-tester pendant que Swan code `apps/web`.

```bash
# API sur :8000
cd apps/api-lab
pnpm install
pnpm dev
```

→ http://localhost:5174 (proxy Vite vers l’API)

## Backend tests (pytest)

Unit + API integration against a **dedicated** Postgres DB (`betterintra_test`). No live 42 API calls.

```bash
# once
createdb -O betterintra betterintra_test 2>/dev/null || true

cd apps/server
uv sync --group dev
uv run pytest -q
```

Override DB: `TEST_DATABASE_URL=postgresql+psycopg://… uv run pytest -q`

`make ci-backend` runs the same suite against a throwaway container (needs `uv`).
Same commands as the CI job — see [`.github/README.md`](.github/README.md).

## Environment

Never commit real `.env` or 42 secrets.

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | `apps/server` | Postgres |
| `CORS_ORIGINS` | `apps/server` | Origines front autorisées |
| `FORTY_TWO_*` | `apps/server` | OAuth 42 |
| `FRONTEND_URL` | `apps/server` | Redirect après OAuth |

## Layout

```
better-intra/
├── apps/
│   ├── server/     # FastAPI (Malik)
│   ├── web/        # Front officiel (Swan)
│   ├── api-lab/    # Preview / smoke UI
│   └── docs/       # Docs API (Docusaurus)
├── docs/           # CDC, devops, déploiement…
└── AGENTS.md
```

### AI usage

AI assistants help with scaffolding and notes. Team reviews and owns all code before evaluation.
