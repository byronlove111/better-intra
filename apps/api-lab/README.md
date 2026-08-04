# `apps/api-lab` — temporary API smoke UI

Throwaway React tester that exercises the BetterIntra FastAPI surface.
**Not** Swan’s product frontend (`apps/web`).

## Run

Terminal 1 — API:

```bash
cd apps/server
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2 — lab:

```bash
cd apps/api-lab
pnpm install
pnpm dev
```

Open http://localhost:5174

Vite proxies API + WebSocket paths to `http://localhost:8000` (override with `VITE_PROXY_TARGET`).

## Coverage

| Tab | Hits |
|---|---|
| Auth | register/login/refresh/me + start 42 OAuth |
| Profile | `/users/me`, patch bio, `/users/{login}` |
| Intra | me + search + other user projects/evals/logtime |
| Friends | following/followers/stats/follow + `/presence` |
| Chat / WS | conversations, messages, blocks, `/ws` event log |
| Events | unified `GET /events` + BI CRUD |
| Public API | API keys + `/api/v1/events` CRUD with `X-API-Key` |
| Analytics | logtime JSON + CSV/PDF download |
| Notifications | inbox list |
| Health | `/health`, `/health/db` |

Default login fields are prefilled with the local test user (`abbouras@student.42.fr`).
