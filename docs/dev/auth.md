# Auth

Base path: `/auth`

## Register

Creates a BetterIntra account. Password min 8 chars. Hashed with Argon2id.

```bash
curl -s -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@student.42.fr","password":"alicepass1"}'
```

```ts
await api("/auth/register", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});
// store access_token + refresh_token
```

| Status | When |
|---|---|
| 201 | Created + tokens |
| 409 | Email already registered |
| 422 | Validation (bad email / short password) |

## Login

```bash
curl -s -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@student.42.fr","password":"alicepass1"}'
```

Same `TokenResponse` as register.

## Refresh

When access JWT expires (default ~60 min), exchange refresh token (default ~30 days):

```bash
curl -s -X POST "$API/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"refresh_token\":\"$REFRESH\"}"
```

```ts
const data = await fetch(`${API}/auth/refresh`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ refresh_token: refreshToken }),
}).then((r) => r.json());
localStorage.setItem("access_token", data.access_token);
localStorage.setItem("refresh_token", data.refresh_token);
```

Front pattern: on `401`, try refresh once, retry original request, else logout.

## Current user (JWT account card)

```bash
curl -s "$API/auth/me" -H "Authorization: Bearer $TOKEN"
```

Returns `UserOut` (email, login, avatar, `is_intra_linked`, …).  
For the **unified** profile used by the Profil page, prefer `GET /users/me` ([users-profiles](./users-profiles.md)).

## Link Intra (OAuth 42)

### Why

Without this, campus features (proxy, friends, chat, analytics, …) return **403**.

### Front flow

1. User is logged in (JWT).
2. Call `GET /auth/42`.
3. Redirect browser to `authorize_url`.
4. User accepts on Intra → 42 hits `GET /auth/callback`.
5. API stores 42 tokens on the user and **redirects** to `FRONTEND_URL/?intra=linked` (or `/?intra=error&reason=...`).

```bash
curl -s "$API/auth/42" -H "Authorization: Bearer $TOKEN"
# {"authorize_url":"https://api.intra.42.fr/oauth/authorize?..."}
```

```ts
const { authorize_url } = await api<{ authorize_url: string }>("/auth/42");
window.location.href = authorize_url;
```

**Do not** call `/auth/callback` from the SPA — the browser lands there from 42.

### Env required on API

`FORTY_TWO_CLIENT_ID`, `FORTY_TWO_CLIENT_SECRET`, `FORTY_TWO_REDIRECT_URI` (must match Intra app settings), `FRONTEND_URL`.

### After link

```bash
curl -s "$API/auth/me" -H "Authorization: Bearer $TOKEN"
# user.login, forty_two_id, is_intra_linked: true
```

## Implementing a login page

1. Form → `POST /auth/login` or `/auth/register`.
2. Persist tokens (memory + `localStorage` / secure cookie strategy — team choice).
3. If `!user.is_intra_linked`, show CTA “Lie ton Intra” → step OAuth above.
4. On app boot: `GET /auth/me` (or `/users/me`) to restore session; refresh on 401.
