# Premiers pas

Obtiens un JWT et appelle ta première route protégée avec `fetch`. Ensuite tu pourras lier Intra et brancher le reste.

## Avant de commencer

- Postgres accessible (`DATABASE_URL` dans `apps/server/.env`)
- API lancée sur `http://localhost:8000`
- Front avec `VITE_API_URL=http://localhost:8000` (et CORS OK)

Lancer l’API (terminal serveur) :

```bash
cd apps/server
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

| URL | Rôle |
|---|---|
| http://localhost:8000/docs | OpenAPI / Swagger |
| http://localhost:8000/health | Process vivant |
| http://localhost:8000/health/db | Postgres OK |

## Helper `api()`

À coller une fois dans ton client (ex. `src/lib/api.js`) :

```js
const API = import.meta.env.VITE_API_URL;

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = localStorage.getItem("access_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

export function saveTokens({ access_token, refresh_token }) {
  localStorage.setItem("access_token", access_token);
  localStorage.setItem("refresh_token", refresh_token);
}
```

Les exemples suivants utilisent ce helper.

## 1. Health check

```js
const health = await fetch(`${API}/health`).then((r) => r.json());
// { status: "ok", service: "BetterIntra API" }

const db = await fetch(`${API}/health/db`).then((r) => r.json());
```

## 2. Créer un compte / login

BetterIntra exige **email + password**. OAuth 42 vient après.

```js
// Register
const registered = await api("/auth/register", {
  auth: false,
  method: "POST",
  body: { email: "dev@example.com", password: "devpass42!" },
});
saveTokens(registered);

// Login
const session = await api("/auth/login", {
  auth: false,
  method: "POST",
  body: { email: "dev@example.com", password: "devpass42!" },
});
saveTokens(session);
```

Réponse typique :

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "dev@example.com",
    "login": null,
    "is_intra_linked": false
  }
}
```

## 3. Route protégée

```js
const me = await api("/auth/me");
console.log(me.email, me.is_intra_linked);
```

## 4. Refresh sur 401

```js
async function apiWithRefresh(path, opts = {}) {
  try {
    return await api(path, opts);
  } catch (e) {
    if (!String(e.message).startsWith("401:")) throw e;
    const refresh_token = localStorage.getItem("refresh_token");
    const next = await api("/auth/refresh", {
      auth: false,
      method: "POST",
      body: { refresh_token },
    });
    saveTokens(next);
    return api(path, opts);
  }
}
```

Détails OAuth 42 : [Authentification](./auth).

## Erreurs fréquentes

| Status | Cause | Fix |
|---|---|---|
| 401 | Token manquant / expiré | Login ou refresh |
| 403 | Intra non lié | CTA « Lie ton Intra » |
| 409 | Email déjà pris | Login à la place |
| 422 | Password trop court / email invalide | Corriger le body |

## Suite

- [Architecture](./architecture)  
- [Cookbook front](./frontend-cookbook)  
- [Authentification](./auth)  
