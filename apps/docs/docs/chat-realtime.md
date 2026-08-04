# Chat & temps réel

DM 1-to-1, blocks, présence, read receipts. REST pour l’historique, WebSocket pour le live.

Auth : JWT + Intra lié. Les deux pairs doivent être BI + Intra liés.

## Conversations & messages

```bash
curl -s "$API/conversations" -H "Authorization: Bearer $TOKEN"
curl -s "$API/conversations/3" -H "Authorization: Bearer $TOKEN"

# oldest → newest ; before_id pour remonter
curl -s "$API/conversations/3/messages?limit=50" \
  -H "Authorization: Bearer $TOKEN"
curl -s "$API/conversations/3/messages?limit=50&before_id=100" \
  -H "Authorization: Bearer $TOKEN"
```

`ConversationOut` : `peer` (dont `is_online`), `last_message`, `unread_count`, curseurs de lecture.

## Envoyer un DM

Crée le thread au premier message.

```bash
curl -s -X POST "$API/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"to_login":"dmpeer","body":"Hey!"}'
```

```ts
const msg = await api<Message>("/messages", {
  method: "POST",
  body: JSON.stringify({ to_login, body }),
});
// ouvrir msg.conversation_id ; WS + notif côté destinataire
```

| Status | |
|---|---|
| `201` | OK |
| `403` | Peer non lié / bloqué / soi |
| `404` | Login inconnu |

## Marquer lu

Appelle à l’ouverture du thread :

```bash
curl -s -X POST "$API/conversations/3/read" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Optionnel : `{ "message_id": 42 }`. Émet WS `conversation.read`.

## Blocks

```bash
curl -s "$API/blocks" -H "Authorization: Bearer $TOKEN"
curl -s -X POST "$API/blocks/dmpeer" -H "Authorization: Bearer $TOKEN"
curl -s -X DELETE "$API/blocks/dmpeer" -H "Authorization: Bearer $TOKEN"
```

## Présence REST

```bash
curl -s "$API/presence" -H "Authorization: Bearer $TOKEN"
```

Online = follows connectés. Détails : [Amis & présence](./friends-presence).

## WebSocket

```text
ws://localhost:8000/ws?token=<access_jwt>
```

(`wss://` en prod). Codes close : `4401` auth, `4403` Intra manquant.

```ts
const token = localStorage.getItem("access_token")!;
const ws = new WebSocket(
  `${location.protocol === "https:" ? "wss" : "ws"}://${apiHost}/ws?token=${encodeURIComponent(token)}`,
);

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

| `type` | Payload (essentiel) |
|---|---|
| `presence.snapshot` | `{ online: Peer[] }` (tes follows) |
| `presence.online` / `offline` | peer + `is_online` |
| `message.created` | message + contexte |
| `conversation.read` | `conversation_id`, `user_id`, `last_read_message_id` |
| `notification.created` | notif |

Pas de typing (hors scope). Offline = Postgres ; le WS est additif.

## Recette Chat

1. Connecter WS + `GET /conversations`  
2. Ouvrir thread → messages + `POST …/read`  
3. Composer → `POST /messages`  
4. Merger `message.created`  
5. Afficher `peer.is_online`  

## Suite

- [Notifications](./notifications)  
- [Amis & présence](./friends-presence)  
- [Cookbook front](./frontend-cookbook)  
