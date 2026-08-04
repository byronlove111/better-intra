# Architecture (backend)

## Mental model

```
Browser / SPA
    │  JWT (or X-API-Key for public events)
    ▼
FastAPI (apps/server)
    ├── BetterIntra Postgres  ← writes: users, follows, events, chat, notifs, api keys
    └── api.intra.42.fr       ← reads only (OAuth tokens stored on User)
```

Rules:

1. **Never** call `api.intra.42.fr` from the browser.
2. Email/password account ≠ Intra link. Both exist.
3. Social graph is **Intra-first**: you can follow any 42 login; BetterIntra fields appear when they have a BI account (`is_betterintra_linked`).

## Package layout

```
apps/server/app/
  auth/           # register, login, refresh, OAuth 42
  users/          # unified profiles
  friends/        # follows
  intra/          # 42 proxy + intra_people cache
  events/         # BI events JWT + public /api/v1
  agenda/         # merge Intra + BI feeds
  api_keys/       # personal keys + rate limit
  chat/           # DM, blocks, presence REST
  realtime/       # WebSocket hub
  notifications/  # inbox + hooks
  analytics/      # logtime aggregates + export
```

## Auth matrix (who can call what)

| Area | Auth |
|---|---|
| `POST /auth/register`, `/login`, `/refresh` | Public |
| `GET /auth/callback` | Public (browser redirect from 42) |
| `GET /health*` | Public |
| `GET/PATCH /users/me`, `GET /auth/me`, `GET /auth/42` | JWT |
| `POST/GET/DELETE /api-keys` | JWT |
| `GET/POST/PATCH/DELETE /events` (JWT feed + BI CRUD) | JWT (`GET` works without Intra; Intra items empty if unlinked) |
| `GET /users/{login}`, friends, Intra proxy, chat, presence, notifs, analytics, `/ws` | JWT **+ Intra linked** |
| `/api/v1/events*` | `X-API-Key` (not JWT) |

`require_intra_linked` → HTTP **403** if `forty_two_id` is null.

## Identity objects you’ll see in JSON

| Flag / field | Meaning |
|---|---|
| `is_intra_linked` | This BetterIntra user connected OAuth 42 |
| `is_betterintra_linked` | This Intra identity has a BI account (on `/users/{login}` / friends cards) |
| `login` / `forty_two_id` | 42 identity |
| `is_online` | Active WebSocket (BI accounts only; `null` if Intra-only) |

## Realtime

Single-process in-memory hub (`app/realtime/ws_manager.py`):

- Connect: `ws://host/ws?token=<access_jwt>` (Intra required)
- Events: `presence.*`, `message.created`, `conversation.read`, `notification.created`
- Presence is **follow-scoped** (not global)

Multi-worker / multi-host would need Redis later — not required for the subject MVP.

## Passwords & secrets

- User passwords: **Argon2id** (`pwdlib`), column `password_hash` — never plaintext.
- API keys: SHA-256 hash stored; raw key returned **once** at creation.
- 42 access/refresh tokens: stored to call Intra (needed server-side).

## Related product docs

- Scope / points: [`../cahier-des-charges.md`](../cahier-des-charges.md)
- Deploy: [`../deploiement.md`](../deploiement.md), [`../devops.md`](../devops.md)
