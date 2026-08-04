# Amis & présence

Le module amis ne copie pas un carnet d’adresses BetterIntra fermé. Tu follow des **identités Intra** (un login 42). Certaines ont un compte chez nous, d’autres non. La présence online, elle, ne concerne que ceux qui ont un compte BI **et** un WebSocket ouvert — et tu ne vois que ceux que **tu** follow. Ça évite de transformer BetterIntra en annuaire global de qui est connecté sur le campus.

Auth : JWT + Intra lié.

## Lister following, followers et stats

`GET /friends/following` renvoie les gens que tu follow, avec pour chacun les infos d’affichage (login, display name, avatar) et les flags utiles : `is_betterintra_linked`, éventuellement `bio` / `betterintra_user_id`, et `is_online` quand c’est un compte BI. `GET /friends/followers` liste ceux qui te follow (des users BetterIntra, puisqu’il faut un compte BI pour follow). `GET /friends/stats` te donne les compteurs pour un header « X following · Y followers ».

```js
const following = await fetch("http://localhost:8000/friends/following", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());

const followers = await fetch("http://localhost:8000/friends/followers", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());

const stats = await fetch("http://localhost:8000/friends/stats", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());
```

## Follow et unfollow

`POST /friends/{login}` résout le login via Intra, crée/maj `intra_people`, et pose le lien. Tu ne peux pas te follow toi-même (**400**). Si le follow existe déjà, **409**. Si le login Intra est introuvable, **404**. Unfollow est un `DELETE` qui répond **204**.

Quand tu follow quelqu’un qui a un compte BI, le serveur lui crée aussi une [notification](./notifications) de type `follow`.

```js
await fetch(`http://localhost:8000/friends/${encodeURIComponent(login)}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${access_token}` },
});

await fetch(`http://localhost:8000/friends/${encodeURIComponent(login)}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${access_token}` },
});
```

## Regarder le graphe de quelqu’un d’autre

Les routes `/friends/{login}/following`, `/followers` et `/stats` permettent d’ouvrir le social d’un profil public. Sur les stats d’un autre, `is_following` te dit si **toi**, le viewer, follow déjà cette identité — utile pour l’état d’un bouton Follow/Following.

```js
const theirStats = await fetch(
  `http://localhost:8000/friends/${login}/stats`,
  { headers: { Authorization: `Bearer ${access_token}` } },
).then((r) => r.json());
```

## La présence, à quoi ça sert

`GET /presence` répond : « parmi les gens que je follow, qui a un WS ouvert maintenant ? ». Ce n’est pas un remplacement du flag `is_online` sur un profil précis : pour un login donné, `GET /users/{login}` reste la source. En live, le WebSocket pousse `presence.snapshot` à la connexion, puis `presence.online` / `presence.offline` quand l’état change — détails dans [Chat & temps réel](./chat-realtime).

```js
const { online } = await fetch("http://localhost:8000/presence", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());
```

Il n’y a pas de relation Friendship bilatérale à inventer : un follow suffit pour le produit « Amis » du CDC.

Suite : [Users & profils](./users-profiles), [Chat](./chat-realtime), [Notifications](./notifications).
