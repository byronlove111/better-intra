# Architecture

Comment l’API est découpée, où vivent les secrets, et quelle auth chaque surface exige.

## Modèle mental

```text
SPA / client
   │  JWT  (ou X-API-Key pour /api/v1/events)
   ▼
FastAPI  apps/server
   ├── Postgres BetterIntra   ← écritures sociales / orga
   └── api.intra.42.fr        ← lectures seules (tokens OAuth sur User)
```

Trois règles non négociables :

1. Le navigateur **ne parle jamais** à `api.intra.42.fr`.
2. Compte email/password ≠ lien Intra — les deux coexistent.
3. Le social est **Intra-first** : follow n’importe quel login 42 ; les champs BI apparaissent si `is_betterintra_linked`.

## Packages

| Dossier | Responsabilité |
|---|---|
| `auth/` | Register, login, refresh, OAuth 42 |
| `users/` | Profils unifiés |
| `friends/` | Follows |
| `intra/` | Proxy 42 + cache `intra_people` |
| `events/` + `agenda/` | Events BI + feed unifié |
| `api_keys/` | Clés + rate limit |
| `chat/` + `realtime/` | DM, blocks, WS |
| `notifications/` | Inbox + hooks |
| `analytics/` | Logtime + exports |

## Matrice d’auth

| Surface | Auth requise |
|---|---|
| Register / login / refresh, health, callback OAuth | Public |
| `/auth/me`, `/auth/42`, `/users/me`, api-keys, CRUD `/events` JWT | JWT |
| `/users/{login}`, friends, proxy Intra, chat, presence, notifs, analytics, `/ws` | JWT **+ Intra lié** |
| `/api/v1/events*` | `X-API-Key` |

`require_intra_linked` → **403** si `forty_two_id` est null.

## Flags d’identité (JSON)

| Champ | Signification |
|---|---|
| `is_intra_linked` | Ce compte BI a connecté OAuth 42 |
| `is_betterintra_linked` | Cette identité Intra a un compte BI |
| `login` / `forty_two_id` | Identité 42 |
| `is_online` | WS actif (BI only ; `null` si Intra-only) |

## Temps réel

Hub in-memory mono-processus (`realtime/ws_manager.py`) :

- `ws://host/ws?token=<access_jwt>` (Intra requis)
- Events : `presence.*`, `message.created`, `conversation.read`, `notification.created`
- Présence **scopée aux follows** (pas globale)

:::note Scale
Multi-worker / multi-host → Redis plus tard. Hors scope MVP sujet.
:::

## Secrets

| Secret | Stockage |
|---|---|
| Password user | Argon2id (`password_hash`) — jamais en clair |
| Clé API | SHA-256 ; brute renvoyée **une fois** à la création |
| Tokens 42 | En BDD pour appeler Intra côté serveur |

## Docs produit

- [Cahier des charges](https://github.com/byronlove111/better-intra/blob/main/docs/cahier-des-charges.md)
- [Déploiement](https://github.com/byronlove111/better-intra/blob/main/docs/deploiement.md) · [DevOps](https://github.com/byronlove111/better-intra/blob/main/docs/devops.md)

## Suite

- [Premiers pas](./getting-started)  
- [Authentification](./auth)  
- [Cookbook front](./frontend-cookbook)  
