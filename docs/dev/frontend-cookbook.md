# Frontend cookbook

Map CDC pages → API calls. Use this as Swan’s integration checklist.

Assume `api()` sends `Authorization: Bearer <access>` and `VITE_API_URL` points at the API (or a Vite proxy).

## Global

| Concern | How |
|---|---|
| Session restore | `GET /auth/me` or `GET /users/me` on boot |
| 401 handling | `POST /auth/refresh` then retry; else login |
| Intra gate | If `!is_intra_linked` → CTA → `GET /auth/42` → redirect |
| Live | One shared `WebSocket` to `/ws?token=…` for chat/presence/notifs |

## Login / Signup

- `POST /auth/register` / `POST /auth/login`
- Store tokens; route to dashboard

## Dashboard

- `GET /me/intra` — level, wallet, correction points  
- `GET /events?limit=5` — upcoming  
- `GET /notifications?limit=5` — inbox peek  
- Optional: `GET /presence` — friends online widget  

## Profil (self / other)

- Self: `GET /users/me`, bio `PATCH /users/me`  
- Other: `GET /users/{login}`  
- Follow: `POST|DELETE /friends/{login}`  
- DM if `is_betterintra_linked`: navigate chat with `to_login`  
- Search: `GET /intra/users?q=`  

## Projets

- `GET /me/intra/projects`  
- Other user: `GET /intra/users/{login}/projects`  

## Agenda

- List/filter: `GET /events?q=&sources=&begin_at=&end_at=`  
- Create BI: `POST /events`  
- Edit/delete BI: `PATCH|DELETE /events/{id}` when `can_edit`  

## Évaluations

- `GET /me/intra/evaluations`  

## Logtime

- `GET /analytics/logtime`  
- Export: `/analytics/logtime/export.csv` + `.pdf`  

## Amis

- `GET /friends/following`, `/followers`, `/stats`  
- `POST|DELETE /friends/{login}`  
- Online: `GET /presence` + WS `presence.*`  

## Chat

- `GET /conversations`  
- `GET /conversations/{id}/messages`  
- `POST /conversations/{id}/read`  
- `POST /messages` `{ to_login, body }`  
- Blocks: `/blocks`  
- WS: `message.created`, `conversation.read`  

## Notifications

- `GET /notifications`  
- WS: `notification.created`  

## Settings (API keys)

- `GET|POST /api-keys`, `DELETE /api-keys/{id}`  
- Document `/api/v1/events` for automation  

## Error UX cheat-sheet

| HTTP | Typical meaning | UI |
|---|---|---|
| 401 | Bad/missing/expired JWT | Refresh or login |
| 403 | Intra not linked / not allowed | CTA or toast |
| 404 | Unknown login / event | Empty state |
| 409 | Duplicate follow / email | Inline error |
| 422 | Validation | Show field errors from `detail` |
| 429 | API key rate limit | Backoff |

## Still missing on backend

Peer recommendations (`GET /recommendations`) — not implemented yet (module of choice). Document when shipped.
