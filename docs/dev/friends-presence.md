# Friends & presence

Base path: `/friends` · presence: `GET /presence`  
Auth: JWT + Intra linked.

## Concepts

- You follow an **Intra identity** (`forty_two_id` / login), not only BI users.
- Response cards include `is_betterintra_linked`, optional `bio` / `betterintra_user_id`, and `is_online` when BI-linked.
- Online = that BI user has an active `/ws` connection.
- `GET /presence` returns **only people you follow** who are online (not the whole campus).

## My following / followers / stats

```bash
curl -s "$API/friends/following" -H "Authorization: Bearer $TOKEN"
curl -s "$API/friends/followers" -H "Authorization: Bearer $TOKEN"
curl -s "$API/friends/stats" -H "Authorization: Bearer $TOKEN"
```

Example `following` item:

```json
{
  "forty_two_id": 202953,
  "login": "abbouras",
  "display_name": "…",
  "avatar_url": "…",
  "followed_at": "…",
  "is_betterintra_linked": true,
  "betterintra_user_id": 7,
  "bio": "…",
  "is_online": false
}
```

## Follow / unfollow

```bash
curl -s -X POST "$API/friends/kclaudan" -H "Authorization: Bearer $TOKEN"
curl -s -X DELETE "$API/friends/kclaudan" -H "Authorization: Bearer $TOKEN" -o /dev/null -w "%{http_code}\n"
```

```ts
await api(`/friends/${login}`, { method: "POST" });   // 201 FriendOut
await api(`/friends/${login}`, { method: "DELETE" }); // 204
```

| Status | |
|---|---|
| 201 | Followed |
| 409 | Already following |
| 400 | Cannot follow yourself |
| 404 | Unknown Intra login (42 lookup failed) |

Following someone with a BI account triggers a **notification** for them (`type: follow`).

## Someone else’s graph

```bash
curl -s "$API/friends/abbouras/following" -H "Authorization: Bearer $TOKEN"
curl -s "$API/friends/abbouras/followers" -H "Authorization: Bearer $TOKEN"
curl -s "$API/friends/abbouras/stats" -H "Authorization: Bearer $TOKEN"
```

`stats` includes `is_following` for the viewer (except on own stats).

## Presence (REST)

```bash
curl -s "$API/presence" -H "Authorization: Bearer $TOKEN"
# { "online": [ { "id", "login", "display_name", "avatar_url", "is_online": true }, ... ] }
```

```ts
const { online } = await api<{ online: Peer[] }>("/presence");
// green dots on friends list / dashboard widget
```

Live updates: WebSocket `presence.snapshot` / `presence.online` / `presence.offline`  
(scoped: snapshot = your follows; broadcasts go to **your followers**).  
See [chat-realtime](./chat-realtime).

## Implementing the Amis page

1. `GET /friends/following` + `GET /friends/followers`.
2. Form → `POST /friends/{login}`.
3. Unfollow → `DELETE`.
4. Online strip → `GET /presence` + subscribe WS.
5. Open profile → `/users/{login}` route.
