# Users & profils

Profils **Intra-first** : n’importe quel login 42 est adressable. Les champs BetterIntra n’apparaissent que s’il y a un compte BI.

Helper : [`api()`](./getting-started#helper-api).

## Mon profil unifié

```js
const me = await api("/users/me");

if (!me.is_intra_linked) {
  // afficher CTA « Lie ton Intra »
}
```

| Champ | Usage UI |
|---|---|
| `is_intra_linked` | CTA « Lie ton Intra » |
| `is_betterintra_linked` | Toujours `true` sur `/me` |
| `intra` | Bloc campus (ou `null`) |
| `bio` | Bio éditable si Intra lié |
| `is_online` | WS connecté (toi) |
| `login`, `avatar_url`, `display_name` | Header |

Auth : JWT (Intra optionnel pour lire `/me`).

## Éditer la bio

JWT + **Intra lié**.

```js
const updated = await api("/users/me", {
  method: "PATCH",
  body: { bio: "Hello from BetterIntra" },
});
```

Max 500 caractères. Sinon **403**.

## Profil d’un login 42

JWT + Intra lié.

```js
const profile = await api(`/users/${encodeURIComponent(login)}`);

if (profile.is_betterintra_linked) {
  // bio, id BI, bouton DM, is_online boolean
} else {
  // Intra-only : follow OK, pas de DM
}
// is_online === null → pas de compte BI
```

## Recette page Profil

| UI | Appel |
|---|---|
| Soi | `api("/users/me")` |
| Bio | `api("/users/me", { method: "PATCH", body: { bio } })` |
| Recherche | `api("/intra/users?q=…")` puis `/users/{login}` |
| Follow | `api("/friends/{login}", { method: "POST" })` |
| Message | si `is_betterintra_linked` → [Chat](./chat-realtime) |
| Online | `profile.is_online` |

## Suite

- [Amis & présence](./friends-presence)  
- [Proxy Intra](./intra-proxy)  
- [Chat](./chat-realtime)  
