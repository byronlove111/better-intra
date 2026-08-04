---
sidebar_position: 1
slug: /
---

# Documentation développeur — BetterIntra API

Guides pour le front, le backend et le devops qui intègrent `apps/server`.

**Contrat live :** [Swagger UI](http://localhost:8000/docs) (OpenAPI).  
Ces pages expliquent *comment construire les features* par-dessus ce contrat.

## Index

| Doc | Ce que tu vas apprendre |
|---|---|
| [Démarrage](./getting-started) | Lancer l’API, premier login, Bearer token, helpers curl |
| [Architecture](./architecture) | Auth duale, identité Intra-first, matrice d’auth, modules |
| [Auth](./auth) | Register / login / refresh / lien OAuth 42 |
| [Users & profils](./users-profiles) | `/users/me`, `/users/{login}`, bio, flags `is_*` |
| [Amis & présence](./friends-presence) | Graphe de follows + online parmi tes follows |
| [Proxy Intra](./intra-proxy) | Data 42 en lecture seule (profil, projets, évals, logtime, search) |
| [Events (JWT)](./events) | Agenda unifié + CRUD BetterIntra |
| [API publique](./public-api) | Clés API + `/api/v1/events` |
| [Chat & temps réel](./chat-realtime) | DM, blocks, événements WebSocket |
| [Notifications](./notifications) | Inbox + push WS |
| [Analytics](./analytics) | Stats logtime + CSV/PDF |
| [Cookbook front](./frontend-cookbook) | Page → endpoints (ce que Swan doit appeler) |

## Conventions dans les exemples

```bash
export API=http://localhost:8000
export TOKEN='<access_jwt>'
# Optionnel pour les exemples API publique :
export API_KEY='bi_...'
```

```http
Authorization: Bearer $TOKEN
Content-Type: application/json
```

Les erreurs sont en général `{ "detail": "..." }` (string ou tableau de validation).

## UI de preview (optionnel)

Front jetable façon produit (pas Swan) : [apps/api-lab](https://github.com/byronlove111/better-intra/tree/main/apps/api-lab) → http://localhost:5174
