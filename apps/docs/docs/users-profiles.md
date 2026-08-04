# Users & profils

Profils **Intra-first** : n’importe quel login 42 est adressable. Les champs BetterIntra n’apparaissent que si la personne a un compte BI.

## Mon profil unifié

```bash
curl -s "$API/users/me" -H "Authorization: Bearer $TOKEN"
```

| Champ | Usage UI |
|---|---|
| `is_intra_linked` | CTA « Lie ton Intra » |
| `is_betterintra_linked` | Toujours `true` sur `/me` |
| `intra` | Bloc campus (ou `null`) |
| `bio` | Bio éditable si Intra lié |
| `is_online` | WS connecté (toi) |
| `login`, `avatar_url`, `display_name` | Header |

```ts
const me = await api<UserProfile>("/users/me");
if (!me.is_intra_linked) showLinkIntraCta();
```

Auth : JWT (Intra optionnel pour lire `/me`).

## Éditer la bio

JWT + **Intra lié**.

```bash
curl -s -X PATCH "$API/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"bio":"Hello from BetterIntra"}'
```

Max 500 caractères. Sinon **403**.

## Profil d’un login 42

JWT + Intra lié. Fetch Intra + upsert `intra_people`.

```bash
curl -s "$API/users/abbouras" -H "Authorization: Bearer $TOKEN"
```

```ts
const profile = await api(`/users/${login}`);

if (profile.is_betterintra_linked) {
  // bio, id BI, DM, is_online boolean
} else {
  // Intra-only : follow OK, pas de DM
}
// is_online === null → pas de compte BI
```

## Recette page Profil

| UI | Endpoint |
|---|---|
| Soi | `GET /users/me` |
| Bio | `PATCH /users/me` |
| Recherche | `GET /intra/users?q=` puis `GET /users/{login}` |
| Follow | `POST /friends/{login}` |
| Message | si `is_betterintra_linked` → [Chat](./chat-realtime) |
| Online | `profile.is_online` |

## Suite

- [Amis & présence](./friends-presence)  
- [Proxy Intra](./intra-proxy)  
- [Chat](./chat-realtime)  
