# Users & profils

Base path : `/users`

Profils unifiés **Intra-first** : tout login 42 est adressable ; les champs BetterIntra seulement s’ils sont liés.

## Mon profil unifié

`GET /users/me` — JWT (Intra optionnel).

```bash
curl -s "$API/users/me" -H "Authorization: Bearer $TOKEN"
```

Champs utiles :

| Champ | Usage UI |
|---|---|
| `is_intra_linked` | Afficher le CTA « Lie ton Intra » |
| `is_betterintra_linked` | Toujours `true` sur `/me` |
| `intra` | Profil campus imbriqué si lié (`null` sinon) |
| `bio` | Bio BetterIntra (pertinente seulement si Intra lié) |
| `is_online` | Si *toi* as une connexion WS active |
| `login`, `avatar_url`, `display_name` | Header / avatar |

```ts
const me = await api<UserProfile>("/users/me");
if (!me.is_intra_linked) showLinkIntraCta();
```

## Mettre à jour la bio

`PATCH /users/me` — JWT + **Intra lié** (403 sinon).

```bash
curl -s -X PATCH "$API/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"bio":"Hello from BetterIntra"}'
```

```ts
await api("/users/me", {
  method: "PATCH",
  body: JSON.stringify({ bio: text.slice(0, 500) }),
});
```

## Profil par login Intra

`GET /users/{login}` — JWT + Intra lié.

Marche pour **n’importe quel** login 42 (fetch Intra, upsert `intra_people`).

```bash
curl -s "$API/users/abbouras" -H "Authorization: Bearer $TOKEN"
```

```ts
const profile = await api(`/users/${login}`);

if (profile.is_betterintra_linked) {
  // afficher bio, id BI, bouton DM, is_online true/false
} else {
  // carte Intra-only : follow OK, pas de DM (pas de compte BI)
}

// is_online === null → Intra-only (ne peut pas être WS-online sur BetterIntra)
```

## Implémenter la page Profil

| Élément UI | Endpoint |
|---|---|
| Son propre profil | `GET /users/me` |
| Éditer la bio | `PATCH /users/me` |
| Chercher / ouvrir un autre | `GET /intra/users?q=` puis naviguer vers `/users/{login}` ou `GET /users/{login}` |
| Bouton Follow | `POST /friends/{login}` |
| Bouton Message | seulement si `is_betterintra_linked` → chat `POST /messages` |
| Badge online | `profile.is_online` |

Voir aussi [amis & présence](./friends-presence) et [proxy Intra](./intra-proxy).
