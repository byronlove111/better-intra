# Cookbook front

Correspondance pages CDC → appels API. Checklist d’intégration pour Swan.

On suppose un `api()` qui envoie `Authorization: Bearer <access>` et un `VITE_API_URL` qui pointe vers l’API (ou un proxy Vite).

## Global

| Besoin | Comment |
|---|---|
| Restaurer la session | `GET /auth/me` ou `GET /users/me` au boot |
| Gestion 401 | `POST /auth/refresh` puis retry ; sinon login |
| Gate Intra | Si `!is_intra_linked` → CTA → `GET /auth/42` → redirect |
| Live | Un seul `WebSocket` partagé vers `/ws?token=…` pour chat/présence/notifs |

## Login / Signup

- `POST /auth/register` / `POST /auth/login`
- Stocker les tokens ; router vers le dashboard

## Dashboard

- `GET /me/intra` — niveau, wallet, points de correction  
- `GET /events?limit=5` — à venir  
- `GET /notifications?limit=5` — aperçu inbox  
- Optionnel : `GET /presence` — widget amis online  

## Profil (soi / autre)

- Soi : `GET /users/me`, bio `PATCH /users/me`  
- Autre : `GET /users/{login}`  
- Follow : `POST|DELETE /friends/{login}`  
- DM si `is_betterintra_linked` : naviguer chat avec `to_login`  
- Search : `GET /intra/users?q=`  

## Projets

- `GET /me/intra/projects`  
- Autre user : `GET /intra/users/{login}/projects`  

## Agenda

- Liste/filtres : `GET /events?q=&sources=&begin_at=&end_at=`  
- Créer BI : `POST /events`  
- Éditer/supprimer BI : `PATCH|DELETE /events/{id}` si `can_edit`  

## Évaluations

- `GET /me/intra/evaluations`  

## Logtime

- `GET /analytics/logtime`  
- Export : `/analytics/logtime/export.csv` + `.pdf`  

## Amis

- `GET /friends/following`, `/followers`, `/stats`  
- `POST|DELETE /friends/{login}`  
- Online : `GET /presence` + WS `presence.*`  

## Chat

- `GET /conversations`  
- `GET /conversations/{id}/messages`  
- `POST /conversations/{id}/read`  
- `POST /messages` `{ to_login, body }`  
- Blocks : `/blocks`  
- WS : `message.created`, `conversation.read`  

## Notifications

- `GET /notifications`  
- WS : `notification.created`  

## Settings (clés API)

- `GET|POST /api-keys`, `DELETE /api-keys/{id}`  
- Documenter `/api/v1/events` pour l’automation  

## Antisèche erreurs UX

| HTTP | Sens typique | UI |
|---|---|---|
| 401 | JWT manquant/mauvais/expiré | Refresh ou login |
| 403 | Intra non lié / pas autorisé | CTA ou toast |
| 404 | Login / event inconnu | Empty state |
| 409 | Follow / email en doublon | Erreur inline |
| 422 | Validation | Afficher les erreurs de `detail` |
| 429 | Rate limit clé API | Backoff |

## Encore manquant côté backend

Peer recommendations (`GET /recommendations`) — pas encore implémenté (module of choice). À documenter quand ce sera shippé.
