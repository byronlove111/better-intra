# Démarrage

## 1. Lancer l’API

```bash
# Postgres (Homebrew en alternatif) — ou Compose, voir docs/deploiement.md
cd apps/server
cp .env.example .env   # renseigner FORTY_TWO_* pour OAuth + proxy Intra
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

| URL | Rôle |
|---|---|
| http://localhost:8000/docs | Swagger |
| http://localhost:8000/health | Process OK |
| http://localhost:8000/health/db | Postgres joignable |

L’origine du front doit figurer dans `CORS_ORIGINS` (séparée par des virgules), ex. `http://localhost:3000,http://localhost:5174`.

## 2. Health check

```bash
curl -s "$API/health"
# {"status":"ok","service":"BetterIntra API"}

curl -s "$API/health/db"
```

## 3. Créer / se connecter à un compte BetterIntra

Email + password est **obligatoire** (sujet). OAuth 42 est un lien en plus, pas un remplacement.

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

Forme de la réponse :

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

Sauver le token :

```bash
export TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.com","password":"devpass42!"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')
```

## 4. Appeler une route protégée

```bash
curl -s "$API/auth/me" -H "Authorization: Bearer $TOKEN"
```

## 5. Helper fetch côté front (pattern)

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
    // tenter /auth/refresh puis retry — voir auth
  }
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}
```

## 6. Quand tu as besoin des data Intra

Beaucoup de routes sociales / campus exigent **JWT + Intra lié** (`403` avec `"Link your Intra account first"` sinon).

Flux : login → `GET /auth/42` → rediriger l’utilisateur vers `authorize_url` → le callback lie le compte → `user.is_intra_linked === true`.

Détails : [auth](./auth).

## 7. Migrations

Le schéma est géré avec Alembic sous `apps/server`. Après un pull :

```bash
cd apps/server
uv run alembic upgrade head
```

## Suite

- [Architecture & matrice d’auth](./architecture)
- [Cookbook front](./frontend-cookbook)
