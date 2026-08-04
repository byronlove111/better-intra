# Chat & temps réel

Le chat BetterIntra est un DM 1-to-1 entre comptes qui ont **tous les deux** BetterIntra + Intra liés. L’historique vit en Postgres (tu peux chatter offline et resync plus tard). Le WebSocket apporte le live : nouveau message, read receipt, présence, notification. Il n’y a pas d’indicateur de typing — hors scope CDC.

Auth : JWT + Intra lié.

## Conversations et historique

`GET /conversations` peuplent la sidebar : pour chaque thread tu as le peer (login, avatar, `is_online`), le dernier message, un compteur d’unread, et les curseurs de lecture. `GET /conversations/{id}/messages` pagine l’historique oldest→newest ; passe `before_id` pour remonter plus vieux sans recharger tout.

```js
const conversations = await fetch("http://localhost:8000/conversations", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());

const page = await fetch(
  `http://localhost:8000/conversations/${id}/messages?limit=50`,
  { headers: { Authorization: `Bearer ${access_token}` } },
).then((r) => r.json());

const older = await fetch(
  `http://localhost:8000/conversations/${id}/messages?limit=50&before_id=${beforeId}`,
  { headers: { Authorization: `Bearer ${access_token}` } },
).then((r) => r.json());
```

## Envoyer un message

Tu n’as pas besoin de « créer une conversation » à part. `POST /messages` avec `to_login` et `body` crée le thread au premier envoi s’il n’existe pas, puis ajoute le message. Le destinataire reçoit une notif `dm` et un event WS `message.created` s’il est connecté. Un peer non lié, bloqué, ou toi-même → **403** ; login inconnu → **404**.

```js
const msg = await fetch("http://localhost:8000/messages", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ to_login: "dmpeer", body: "Hey!" }),
}).then((r) => r.json());
// msg.conversation_id
```

## Marquer comme lu

Quand un thread s’ouvre, `POST /conversations/{id}/read` met à jour ton curseur. Sans body, ça pointe sur le dernier message ; tu peux aussi passer `{ message_id }`. Le peer reçoit `conversation.read` sur le WebSocket.

```js
await fetch(`http://localhost:8000/conversations/${id}/read`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({}),
});
```

## Blocks

Bloquer empêche la relation DM dans les deux sens côté métier. `GET /blocks` liste, `POST /blocks/{login}` crée, `DELETE` retire.

```js
await fetch(`http://localhost:8000/blocks/${login}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${access_token}` },
});
```

## Présence

`GET /presence` et les events WS `presence.*` sont documentés aussi dans [Amis & présence](./friends-presence) : ce sont les follows online, pas le monde entier. Sur une carte de conversation, `peer.is_online` te donne déjà un signal sans round-trip supplémentaire.

## WebSocket — à quoi ça sert vraiment

Sans WS, le chat marche quand même via REST. Avec WS, l’expérience devient live. Tu te connectes avec le même access JWT en query. Intra doit être lié, sinon close `4403` ; token invalide → `4401`.

À la connexion tu reçois `presence.snapshot` (tes follows online). Ensuite arrivent `presence.online` / `offline`, `message.created`, `conversation.read`, et `notification.created`.

```js
const ws = new WebSocket(
  `ws://localhost:8000/ws?token=${encodeURIComponent(access_token)}`,
);

ws.onmessage = (ev) => {
  const { type, payload } = JSON.parse(ev.data);
  // type: presence.*, message.created, conversation.read, notification.created
};
```

En HTTPS / prod, le schéma devient `wss://…`.

Suite : [Notifications](./notifications), [Amis & présence](./friends-presence), [Cookbook](./frontend-cookbook).
