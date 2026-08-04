# Architecture (backend)

## Modèle mental

```
Browser / SPA
    │  JWT (ou X-API-Key pour les events publics)
    ▼
FastAPI (apps/server)
    ├── Postgres BetterIntra  ← écritures : users, follows, events, chat, notifs, api keys
    └── api.intra.42.fr       ← lectures seules (tokens OAuth stockés sur User)
```

Règles :

1. **Ne jamais** appeler `api.intra.42.fr` depuis le navigateur.
2. Compte email/password ≠ lien Intra. Les deux coexistent.
3. Le graphe social est **Intra-first** : tu peux follow n’importe quel login 42 ; les champs BetterIntra apparaissent s’ils ont un compte BI (`is_betterintra_linked`).

## Layout des packages

```
apps/server/app/
  auth/           # register, login, refresh, OAuth 42
  users/          # profils unifiés
  friends/        # follows
  intra/          # proxy 42 + cache intra_people
  events/         # events BI JWT + public /api/v1
  agenda/         # merge feeds Intra + BI
  api_keys/       # clés perso + rate limit
  chat/           # DM, blocks, presence REST
  realtime/       # hub WebSocket
  notifications/  # inbox + hooks
  analytics/      # agrégats logtime + export
```

## Matrice d’auth (qui peut appeler quoi)

| Zone | Auth |
|---|---|
| `POST /auth/register`, `/login`, `/refresh` | Public |
| `GET /auth/callback` | Public (redirect navigateur depuis 42) |
| `GET /health*` | Public |
| `GET/PATCH /users/me`, `GET /auth/me`, `GET /auth/42` | JWT |
| `POST/GET/DELETE /api-keys` | JWT |
| `GET/POST/PATCH/DELETE /events` (feed JWT + CRUD BI) | JWT (`GET` marche sans Intra ; items Intra vides si non lié) |
| `GET /users/{login}`, friends, proxy Intra, chat, presence, notifs, analytics, `/ws` | JWT **+ Intra lié** |
| `/api/v1/events*` | `X-API-Key` (pas JWT) |

`require_intra_linked` → HTTP **403** si `forty_two_id` est null.

## Objets d’identité que tu verras dans le JSON

| Flag / champ | Signification |
|---|---|
| `is_intra_linked` | Ce user BetterIntra a connecté OAuth 42 |
| `is_betterintra_linked` | Cette identité Intra a un compte BI (sur `/users/{login}` / cartes amis) |
| `login` / `forty_two_id` | Identité 42 |
| `is_online` | WebSocket actif (comptes BI seulement ; `null` si Intra-only) |

## Temps réel

Hub in-memory mono-processus (`app/realtime/ws_manager.py`) :

- Connexion : `ws://host/ws?token=<access_jwt>` (Intra requis)
- Events : `presence.*`, `message.created`, `conversation.read`, `notification.created`
- La présence est **scopée aux follows** (pas globale)

Multi-worker / multi-host → Redis plus tard — pas requis pour le MVP sujet.

## Mots de passe & secrets

- Passwords users : **Argon2id** (`pwdlib`), colonne `password_hash` — jamais en clair.
- Clés API : hash SHA-256 stocké ; clé brute renvoyée **une seule fois** à la création.
- Tokens 42 access/refresh : stockés pour appeler Intra (nécessaire côté serveur).

## Docs produit liées

- Scope / points : [cahier-des-charges](https://github.com/byronlove111/better-intra/blob/main/docs/cahier-des-charges.md)
- Deploy : [deploiement](https://github.com/byronlove111/better-intra/blob/main/docs/deploiement.md), [devops](https://github.com/byronlove111/better-intra/blob/main/docs/devops.md)
