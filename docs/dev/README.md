# Developer docs — BetterIntra API

Guides for front / backend / devops who integrate with `apps/server`.

**Live contract:** [Swagger UI](http://localhost:8000/docs) (OpenAPI).  
These pages explain *how to build features* on top of that contract.

## Index

| Doc | What you’ll learn |
|---|---|
| [Getting started](./getting-started.md) | Run API, first login, Bearer token, curl helpers |
| [Architecture](./architecture.md) | Dual auth, Intra-first identity, auth matrix, modules |
| [Auth](./auth.md) | Register / login / refresh / OAuth 42 link |
| [Users & profiles](./users-profiles.md) | `/users/me`, `/users/{login}`, bio, `is_*` flags |
| [Friends & presence](./friends-presence.md) | Follow graph + online among follows |
| [Intra proxy](./intra-proxy.md) | Read-only 42 data (profil, projets, évals, logtime, search) |
| [Events (JWT)](./events.md) | Unified agenda + BetterIntra CRUD |
| [Public API](./public-api.md) | API keys + `/api/v1/events` |
| [Chat & realtime](./chat-realtime.md) | DM, blocks, WebSocket events |
| [Notifications](./notifications.md) | Inbox + WS push |
| [Analytics](./analytics.md) | Logtime stats + CSV/PDF |
| [Frontend cookbook](./frontend-cookbook.md) | Page → endpoints mapping (what Swan should call) |

## Conventions in examples

```bash
export API=http://localhost:8000
export TOKEN='<access_jwt>'
# Optional for public API examples:
export API_KEY='bi_...'
```

```http
Authorization: Bearer $TOKEN
Content-Type: application/json
```

Errors are usually `{ "detail": "..." }` (string or validation array).

## Preview UI (optional)

Throwaway product-shaped tester (not Swan): [`apps/api-lab`](../../apps/api-lab/README.md) → http://localhost:5174
