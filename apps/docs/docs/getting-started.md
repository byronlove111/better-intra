# Premiers pas

Obtiens un JWT et appelle ta première route protégée. Ensuite tu pourras lier Intra et brancher le reste des features.

## Avant de commencer

- Postgres accessible (`DATABASE_URL` dans `apps/server/.env`)
- Python + UV dans `apps/server`
- Optionnel : `FORTY_TWO_*` pour OAuth / proxy Intra

## 1. Lancer l’API

```bash
cd apps/server
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Vérifie :

```bash
curl -s http://localhost:8000/health
# {"status":"ok","service":"BetterIntra API"}

curl -s http://localhost:8000/health/db
```

| URL | Rôle |
|---|---|
| http://localhost:8000/docs | OpenAPI / Swagger |
| http://localhost:8000/health | Process vivant |
| http://localhost:8000/health/db | Postgres OK |

Ajoute l’origine de ton front dans `CORS_ORIGINS` (ex. `http://localhost:3000,http://localhost:5174`).

## 2. Créer un compte

BetterIntra exige **email + password** (exigence sujet). OAuth 42 vient après.

```bash
curl -s -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "dev@example.com",
    "password": "devpass42!"
  }'
```

Réponse :

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

Login (même forme de réponse) :

```bash
curl -s -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "dev@example.com",
    "password": "devpass42!"
  }'
```

Export rapide du token :

```bash
export TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.com","password":"devpass42!"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')
```

## 3. Appeler une route protégée

```bash
curl -s "$API/auth/me" -H "Authorization: Bearer $TOKEN"
```

## 4. Pattern front (fetch)

```ts
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401) {
    // voir Auth → refresh, puis retry
  }
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}
```

## 5. Débloquer les data campus

Sans Intra lié, friends / chat / proxy / analytics renvoient **403**.

Flux court : login → `GET /auth/42` → redirect `authorize_url` → callback API → `is_intra_linked: true`.

Détails dans [Authentification](./auth).

## Erreurs fréquentes

| Status | Cause | Fix |
|---|---|---|
| 401 | Token manquant / expiré | Login ou [refresh](./auth#refresh) |
| 403 | Intra non lié | CTA « Lie ton Intra » |
| 409 | Email déjà pris | Login à la place |
| 422 | Password moins de 8 / email invalide | Corriger le body |

## Suite

- [Architecture](./architecture) — qui peut appeler quoi  
- [Cookbook front](./frontend-cookbook) — brancher les écrans  
- [Authentification](./auth) — OAuth 42 en détail  
