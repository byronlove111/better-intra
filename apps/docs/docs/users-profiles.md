# Users & profils

BetterIntra ne stocke pas « un user = une ligne Intra ». Le modèle est **Intra-first** : n’importe quel login 42 peut être ouvert en profil. Si cette personne a aussi un compte BetterIntra, on enrichit la carte avec bio, id BI et statut online. Sinon tu vois quand même le profil école, mais sans les features qui exigent un compte chez nous (DM, bio éditable de leur côté, pastille online).

## Mon profil unifié — `GET /users/me`

Cette route est faite pour l’écran « mon profil » et pour le header. Elle marche avec un JWT même si Intra n’est pas encore lié : dans ce cas `intra` est `null` et `is_intra_linked` est `false`. Quand Intra est lié, `intra` contient le bloc campus (wallet, cursus, campus, etc.).

`is_betterintra_linked` est toujours `true` sur `/me` — tu es forcément un compte BI si tu as un JWT. `is_online` indique si **toi** as un WebSocket ouvert en ce moment.

```js
const me = await fetch("http://localhost:8000/users/me", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());
```

## Éditer la bio

La bio est une donnée BetterIntra, pas Intra. `PATCH /users/me` avec `{ bio }` la met à jour, mais seulement si Intra est lié (sinon **403**) : on évite les comptes « fantômes » qui peupleraient le social sans identité école. Limite 500 caractères.

```js
const updated = await fetch("http://localhost:8000/users/me", {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ bio: "Hello from BetterIntra" }),
}).then((r) => r.json());
```

## Profil d’un autre login — `GET /users/{login}`

Ici tu as besoin d’être toi-même Intra-lié (sinon tu ne peux pas résoudre l’identité via l’API 42). Le backend fetch le login sur Intra, met à jour le cache `intra_people`, et regarde s’il existe un user BI rattaché.

Si `is_betterintra_linked` est vrai, tu peux montrer la bio, proposer un DM, et lire `is_online` comme booléen. S’il est faux, `is_online` vaut `null` : cette personne ne peut pas être « online sur BetterIntra », même si tu peux toujours la follow. C’est exactement le cas d’usage Intra-first du CDC.

```js
const profile = await fetch(
  `http://localhost:8000/users/${encodeURIComponent(login)}`,
  { headers: { Authorization: `Bearer ${access_token}` } },
).then((r) => r.json());
```

La recherche d’élèves avant d’ouvrir une fiche passe souvent par `GET /intra/users?q=` — voir [Proxy Intra](./intra-proxy). Follow : `POST /friends/{login}`. Le DM n’a de sens que si `is_betterintra_linked`.

Suite : [Amis & présence](./friends-presence) pour le graphe, [Chat](./chat-realtime) pour les DM.
