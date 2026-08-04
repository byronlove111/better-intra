# Chat & temps réel

DM 1-to-1, blocks, présence, read receipts. REST via `fetch`, live via `WebSocket`.

Auth : JWT + Intra lié. Helper : [`api()`](./getting-started#helper-api).

## Conversations & messages

```js
const conversations = await api("/conversations");
const one = await api(`/conversations/${id}`);

const page = await api(`/conversations/${id}/messages?limit=50`);
const older = await api(`/conversations/${id}/messages?limit=50&before_id=${beforeId}`);
// page.items : oldest → newest
```

`peer.is_online`, `last_message`, `unread_count`, curseurs de lecture.

## Envoyer un DM

Crée le thread au premier message.

```js
const msg = await api("/messages", {
  method: "POST",
  body: { to_login: "dmpeer", body: "Hey!" },
});
// ouvrir msg.conversation_id
```

| Status | |
|---|---|
| `201` | OK |
| `403` | Peer non lié / bloqué / soi |
| `404` | Login inconnu |

## Marquer lu

```js
await api(`/conversations/${id}/read`, {
  method: "POST",
  body: {}, // ou { message_id: 42 }
});
```

Émet WS `conversation.read`.

## Blocks

```js
const blocks = await api("/blocks");
await api(`/blocks/${login}`, { method: "POST" });
await api(`/blocks/${login}`, { method: "DELETE" });
```

## Présence REST

```js
const { online } = await api("/presence");
```

Détails : [Amis & présence](./friends-presence).

## WebSocket

```js
const token = localStorage.getItem("access_token");
const apiHost = new URL(import.meta.env.VITE_API_URL).host;
const proto = location.protocol === "https:" ? "wss" : "ws";

const ws = new WebSocket(`${proto}://${apiHost}/ws?token=${encodeURIComponent(token)}`);

ws.onmessage = (ev) => {
  const { type, payload } = JSON.parse(ev.data);
  switch (type) {
    case "presence.snapshot":
    case "presence.online":
    case "presence.offline":
      updateOnlineFriends(payload);
      break;
    case "message.created":
      appendOrBumpInbox(payload);
      break;
    case "conversation.read":
      updateReadReceipt(payload);
      break;
    case "notification.created":
      toastAndBadge(payload);
      break;
  }
};
```

Codes close : `4401` auth, `4403` Intra manquant.

| `type` | Payload (essentiel) |
|---|---|
| `presence.snapshot` | `{ online: Peer[] }` |
| `presence.online` / `offline` | peer + `is_online` |
| `message.created` | message + contexte |
| `conversation.read` | `conversation_id`, `user_id`, `last_read_message_id` |
| `notification.created` | notif |

Pas de typing. Offline = Postgres ; le WS est additif.

## Recette Chat

1. Connecter WS + `api("/conversations")`  
2. Ouvrir thread → messages + `POST …/read`  
3. Composer → `POST /messages`  
4. Merger `message.created`  
5. Afficher `peer.is_online`  

## Suite

- [Notifications](./notifications)  
- [Amis & présence](./friends-presence)  
- [Cookbook front](./frontend-cookbook)  
