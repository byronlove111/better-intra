# `apps/web` — frontend (Swan)

Dossier à toi : choisis ta stack. Ici = comment parler à l’API.

## Postgres sans Docker (en attendant Ayoub)

Sur macOS avec Homebrew :

```bash
brew install postgresql@16
brew services start postgresql@16

# une seule fois : user + database
createuser -s betterintra 2>/dev/null || true
psql -d postgres -c "ALTER ROLE betterintra WITH LOGIN PASSWORD 'betterintra';"
createdb -O betterintra betterintra 2>/dev/null || true
```

`DATABASE_URL` attendu :
`postgresql+psycopg://betterintra:betterintra@localhost:5432/betterintra`

## Lancer l’API (dev)

```bash
cd apps/server
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API : http://localhost:8000  
- Doc (Swagger) : http://localhost:8000/docs  

## `.env` côté front

```bash
VITE_API_URL=http://localhost:8000
# ou NEXT_PUBLIC_API_URL=...
```

```js
await fetch(`${import.meta.env.VITE_API_URL}/health`)
```

## `.env` côté API (si ton front n’est pas sur :3000)

Dans `apps/server/.env` :

```bash
CORS_ORIGINS=http://localhost:3000
# ex. http://localhost:5173
```

Redémarre l’API après changement.
