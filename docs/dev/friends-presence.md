# Amis & présence

Base path : `/friends` · présence : `GET /presence`  
Auth : JWT + Intra lié.

## Concepts

- Tu follow une **identité Intra** (`forty_two_id` / login), pas seulement des users BI.
- Les cartes de réponse incluent `is_betterintra_linked`, éventuellement `bio` / `betterintra_user_id`, et `is_online` si lié BI.
- Online = ce user BI a une connexion `/ws` active.
- `GET /presence` renvoie **uniquement les gens que tu follow** qui sont online (pas tout le campus).

## Mes following / followers / stats

```bash
curl -s "$API/friends/following" -H "Authorization: Bearer $TOKEN"
curl -s "$API/friends/followers" -H "Authorization: Bearer $TOKEN"
curl -s "$API/friends/stats" -H "Authorization: Bearer $TOKEN"
```

Exemple d’item `following` :

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
| 201 | Follow OK |
| 409 | Déjà en follow |
| 400 | Impossible de se follow soi-même |
| 404 | Login Intra inconnu (lookup 42 échoué) |

Follow quelqu’un qui a un compte BI déclenche une **notification** chez lui (`type: follow`).

## Graphe d’un autre login

```bash
curl -s "$API/friends/abbouras/following" -H "Authorization: Bearer $TOKEN"
curl -s "$API/friends/abbouras/followers" -H "Authorization: Bearer $TOKEN"
curl -s "$API/friends/abbouras/stats" -H "Authorization: Bearer $TOKEN"
```

`stats` inclut `is_following` pour le viewer (sauf sur ses propres stats).

## Présence (REST)

```bash
curl -s "$API/presence" -H "Authorization: Bearer $TOKEN"
# { "online": [ { "id", "login", "display_name", "avatar_url", "is_online": true }, ... ] }
```

```ts
const { online } = await api<{ online: Peer[] }>("/presence");
// pastilles vertes sur la liste d’amis / widget dashboard
```

Updates live : WebSocket `presence.snapshot` / `presence.online` / `presence.offline`  
(scopé : snapshot = tes follows ; broadcasts vers **tes followers**).  
Voir [chat & temps réel](./chat-realtime).

## Implémenter la page Amis

1. `GET /friends/following` + `GET /friends/followers`.
2. Formulaire → `POST /friends/{login}`.
3. Unfollow → `DELETE`.
4. Bandeau online → `GET /presence` + subscribe WS.
5. Ouvrir un profil → route `/users/{login}`.
