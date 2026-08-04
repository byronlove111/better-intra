# Cookbook front

Checklist d’intégration : chaque écran CDC → appels API. À utiliser comme carte mentale Swan.

Suppose un helper `api()` avec `Authorization: Bearer` et `VITE_API_URL` (ou proxy Vite).

## Global

| Besoin | Comment |
|---|---|
| Boot session | `GET /auth/me` ou `GET /users/me` |
| 401 | `POST /auth/refresh` → retry → sinon login |
| Gate Intra | CTA → `GET /auth/42` → redirect |
| Live | **Un** WebSocket `/ws?token=` partagé |

<div class="doc-cards">
  <a class="doc-card" href="/auth"><strong>Auth</strong><span>Login, refresh, OAuth.</span></a>
  <a class="doc-card" href="/chat-realtime"><strong>Realtime</strong><span>WS events à brancher.</span></a>
  <a class="doc-card" href="/architecture"><strong>Matrice</strong><span>JWT vs Intra vs API key.</span></a>
</div>

## Écrans

### Login / Signup

`POST /auth/register` · `POST /auth/login` → stocker tokens → dashboard.

### Dashboard

- `GET /me/intra` — niveau, wallet  
- `GET /events?limit=5` — prochains events  
- `GET /notifications?limit=5` — peek inbox  
- Optionnel `GET /presence`  

### Profil

- Soi : `GET|PATCH /users/me`  
- Autre : `GET /users/{login}`  
- Follow : `POST|DELETE /friends/{login}`  
- DM si `is_betterintra_linked`  
- Search : `GET /intra/users?q=`  

### Projets / Évals

- `GET /me/intra/projects`  
- `GET /me/intra/evaluations`  
- Autre : `/intra/users/{login}/…`  

### Agenda

- `GET /events` (+ filtres)  
- `POST|PATCH|DELETE /events/{id}` si `can_edit`  

### Logtime

- `GET /analytics/logtime`  
- `/analytics/logtime/export.csv` · `.pdf`  

### Amis

- `/friends/following|followers|stats`  
- Follow / unfollow  
- Online : `/presence` + WS `presence.*`  

### Chat

- `/conversations`, `/messages`, `/…/read`, `/blocks`  
- WS : `message.created`, `conversation.read`  

### Notifications

- `GET /notifications`  
- WS : `notification.created`  

### Settings API keys

- `GET|POST /api-keys`, `DELETE /api-keys/{id}`  
- Doc utilisateur → `/api/v1/events`  

## Antisèche HTTP

| Code | Sens | UI |
|---|---|---|
| `401` | JWT | Refresh / login |
| `403` | Intra / droits | CTA ou toast |
| `404` | Inconnu | Empty |
| `409` | Conflit | Inline |
| `422` | Validation | Afficher `detail` |
| `429` | Rate limit clé | Backoff |

## Pas encore shippé

`GET /recommendations` (module of choice) — à documenter à la livraison.

## Suite

- [Premiers pas](./getting-started)  
- [Architecture](./architecture)  
