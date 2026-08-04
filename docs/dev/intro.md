---
sidebar_position: 1
slug: /
---

# Developer docs — BetterIntra API

Guides for front / backend / devops who integrate with `apps/server`.

**Live contract:** [Swagger UI](http://localhost:8000/docs) (OpenAPI).  
These pages explain *how to build features* on top of that contract.

## Index

| Doc | What you’ll learn |
|---|---|
| [Getting started](./getting-started) | Run API, first login, Bearer token, curl helpers |
| [Architecture](./architecture) | Dual auth, Intra-first identity, auth matrix, modules |
| [Auth](./auth) | Register / login / refresh / OAuth 42 link |
| [Users & profiles](./users-profiles) | `/users/me`, `/users/{login}`, bio, `is_*` flags |
| [Friends & presence](./friends-presence) | Follow graph + online among follows |
| [Intra proxy](./intra-proxy) | Read-only 42 data (profil, projets, évals, logtime, search) |
| [Events (JWT)](./events) | Unified agenda + BetterIntra CRUD |
| [Public API](./public-api) | API keys + `/api/v1/events` |
| [Chat & realtime](./chat-realtime) | DM, blocks, WebSocket events |
| [Notifications](./notifications) | Inbox + WS push |
| [Analytics](./analytics) | Logtime stats + CSV/PDF |
| [Frontend cookbook](./frontend-cookbook) | Page → endpoints mapping (what Swan should call) |

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

Throwaway product-shaped tester (not Swan): [apps/api-lab](https://github.com/byronlove111/better-intra/tree/main/apps/api-lab) → http://localhost:5174
