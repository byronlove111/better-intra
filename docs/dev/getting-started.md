# Getting started

## 1. Run the API

```bash
# Postgres (Homebrew alternative) — or use Compose per docs/deploiement.md
cd apps/server
cp .env.example .env   # fill FORTY_TWO_* for OAuth + Intra proxy
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

| URL | Purpose |
|---|---|
| http://localhost:8000/docs | Swagger |
| http://localhost:8000/health | Process up |
| http://localhost:8000/health/db | Postgres reachable |

Front origin must appear in `CORS_ORIGINS` (comma-separated), e.g. `http://localhost:3000,http://localhost:5174`.

## 2. Health check

```bash
curl -s "$API/health"
# {"status":"ok","service":"BetterIntra API"}

curl -s "$API/health/db"
```

## 3. Create / login a BetterIntra account

Email + password is **mandatory** (subject). OAuth 42 is an extra link, not a replacement.

```bash
# Register
curl -s -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.com","password":"devpass42!"}'

# Login
curl -s -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.com","password":"devpass42!"}'
```

Response shape:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "dev@example.com",
    "login": null,
    "is_intra_linked": false
  }
}
```

Save tokens:

```bash
export TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.com","password":"devpass42!"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')
```

## 4. Call a protected route

```bash
curl -s "$API/auth/me" -H "Authorization: Bearer $TOKEN"
```

## 5. Front fetch helper (pattern)

```ts
async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  if (res.status === 401) {
    // try /auth/refresh then retry — see auth.md
  }
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}
```

## 6. When you need Intra data

Many social / campus routes require **JWT + Intra linked** (`403` with `"Link your Intra account first"` otherwise).

Flow: login → `GET /auth/42` → redirect user to `authorize_url` → callback links account → `user.is_intra_linked === true`.

Details: [auth.md](./auth.md).

## 7. Migrations

Schema is managed with Alembic under `apps/server`. After pulling:

```bash
cd apps/server
uv run alembic upgrade head
```

## Next

- [Architecture & auth matrix](./architecture.md)
- [Frontend cookbook](./frontend-cookbook.md)
