# Amis & présence

Follow n’importe quelle identité Intra. Affiche qui est online **parmi tes follows**.

Auth : JWT + Intra lié.

## Concepts

- Tu follow un **login 42**, pas seulement des comptes BI.
- Carte ami : `is_betterintra_linked`, `bio` / `betterintra_user_id` si BI, `is_online` si BI.
- Online = WebSocket actif sur BetterIntra.
- `GET /presence` ≠ « tout le campus » : uniquement tes follows online.

## Listes

```bash
curl -s "$API/friends/following" -H "Authorization: Bearer $TOKEN"
curl -s "$API/friends/followers" -H "Authorization: Bearer $TOKEN"
curl -s "$API/friends/stats" -H "Authorization: Bearer $TOKEN"
```

Exemple d’item :

```json
{
  "forty_two_id": 202953,
  "login": "abbouras",
  "display_name": "…",
  "is_betterintra_linked": true,
  "betterintra_user_id": 7,
  "bio": "…",
  "is_online": false,
  "followed_at": "…"
}
```

## Follow / unfollow

```bash
curl -s -X POST "$API/friends/kclaudan" \
  -H "Authorization: Bearer $TOKEN"

curl -s -X DELETE "$API/friends/kclaudan" \
  -H "Authorization: Bearer $TOKEN" -o /dev/null -w "%{http_code}\n"
```

| Status | |
|---|---|
| `201` | Follow créé |
| `409` | Déjà followed |
| `400` | Self-follow |
| `404` | Login Intra inconnu |

Un follow vers un compte BI crée une [notification](./notifications) `type: follow`.

## Graphe d’un autre login

```bash
curl -s "$API/friends/abbouras/following" -H "Authorization: Bearer $TOKEN"
curl -s "$API/friends/abbouras/followers" -H "Authorization: Bearer $TOKEN"
curl -s "$API/friends/abbouras/stats" -H "Authorization: Bearer $TOKEN"
```

`stats.is_following` indique si **toi** follow cette identité.

## Présence REST

```bash
curl -s "$API/presence" -H "Authorization: Bearer $TOKEN"
```

```json
{
  "online": [
    {
      "id": 20,
      "login": "dmpeer",
      "display_name": "DM Peer",
      "avatar_url": null,
      "is_online": true
    }
  ]
}
```

Live : WS `presence.snapshot` / `online` / `offline` — voir [Chat & temps réel](./chat-realtime).

## Recette page Amis

1. Charger following + followers  
2. Formulaire follow → `POST`  
3. Unfollow → `DELETE`  
4. Bandeau online → `GET /presence` + WS  
5. Clic profil → `/users/{login}`  

## Suite

- [Users & profils](./users-profiles)  
- [Chat & temps réel](./chat-realtime)  
- [Notifications](./notifications)  
