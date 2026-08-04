# Amis & présence

Follow n’importe quelle identité Intra. Affiche qui est online **parmi tes follows**.

Auth : JWT + Intra lié. Helper : [`api()`](./getting-started#helper-api).

## Concepts

- Tu follow un **login 42**, pas seulement des comptes BI.
- Carte ami : `is_betterintra_linked`, `bio` / `betterintra_user_id` si BI, `is_online` si BI.
- Online = WebSocket actif sur BetterIntra.
- `GET /presence` ≠ tout le campus : uniquement tes follows online.

## Listes

```js
const following = await api("/friends/following");
const followers = await api("/friends/followers");
const stats = await api("/friends/stats");

// following.items[0] →
// { login, is_betterintra_linked, is_online, bio, betterintra_user_id, … }
```

## Follow / unfollow

```js
await api(`/friends/${encodeURIComponent(login)}`, { method: "POST" }); // 201
await api(`/friends/${encodeURIComponent(login)}`, { method: "DELETE" }); // 204 → null
```

| Status | |
|---|---|
| `201` | Follow créé |
| `409` | Déjà followed |
| `400` | Self-follow |
| `404` | Login Intra inconnu |

Un follow vers un compte BI crée une [notification](./notifications) `type: follow`.

## Graphe d’un autre login

```js
const theirFollowing = await api(`/friends/${login}/following`);
const theirFollowers = await api(`/friends/${login}/followers`);
const theirStats = await api(`/friends/${login}/stats`);
// theirStats.is_following → est-ce que *toi* le follow ?
```

## Présence

```js
const { online } = await api("/presence");
// online: [{ id, login, display_name, avatar_url, is_online: true }, …]
```

Live : WS `presence.snapshot` / `online` / `offline` — [Chat & temps réel](./chat-realtime).

## Recette page Amis

1. `api("/friends/following")` + `followers`  
2. Form → `POST /friends/{login}`  
3. Unfollow → `DELETE`  
4. Bandeau → `api("/presence")` + WS  
5. Clic profil → `/users/{login}`  

## Suite

- [Users & profils](./users-profiles)  
- [Chat & temps réel](./chat-realtime)  
- [Notifications](./notifications)  
