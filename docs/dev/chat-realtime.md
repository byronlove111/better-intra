# Chat & realtime

Auth: JWT + Intra linked. Both peers must be BetterIntra + Intra-linked to DM.

## Conversations

```bash
curl -s "$API/conversations" -H "Authorization: Bearer $TOKEN"
curl -s "$API/conversations/3" -H "Authorization: Bearer $TOKEN"
```

`ConversationOut` includes `peer` (`login`, `is_online`, …), `last_message`, `unread_count`, read cursors.

## Messages

Cursor pagination: oldest → newest page; pass `before_id` for older history.

```bash
curl -s "$API/conversations/3/messages?limit=50" -H "Authorization: Bearer $TOKEN"
curl -s "$API/conversations/3/messages?limit=50&before_id=100" \
  -H "Authorization: Bearer $TOKEN"
```

## Send DM

Creates the 1:1 thread on first message.

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
// msg.conversation_id → open thread; also pushes WS + notification to recipient
```

| Status | |
|---|---|
| 201 | Sent |
| 403 | Peer not Intra-linked / blocked / self |
| 404 | Unknown login |

## Mark read

```bash
curl -s -X POST "$API/conversations/3/read" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{}'
# optional: { "message_id": 42 }
```

Call when the user opens the thread. Emits WS `conversation.read` to the peer.

## Blocks

```bash
curl -s "$API/blocks" -H "Authorization: Bearer $TOKEN"
curl -s -X POST "$API/blocks/dmpeer" -H "Authorization: Bearer $TOKEN"
curl -s -X DELETE "$API/blocks/dmpeer" -H "Authorization: Bearer $TOKEN" -o /dev/null -w "%{http_code}\n"
```

## Presence REST

```bash
curl -s "$API/presence" -H "Authorization: Bearer $TOKEN"
```

Online **follows** only — [friends-presence](./friends-presence.md).

## WebSocket

```
ws://localhost:8000/ws?token=<access_jwt>
```

(or `wss://` in prod). Intra required (`4403` if not). Missing/invalid token → `4401`.

```ts
const token = localStorage.getItem("access_token");
const ws = new WebSocket(
  `${location.protocol === "https:" ? "wss" : "ws"}://${apiHost}/ws?token=${encodeURIComponent(token!)}`,
);

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data) as { type: string; payload: unknown };
  switch (msg.type) {
    case "presence.snapshot":
    case "presence.online":
    case "presence.offline":
      // update online friends
      break;
    case "message.created":
      // append message if conversation open; bump inbox
      break;
    case "conversation.read":
      // update peer read receipt
      break;
    case "notification.created":
      // toast + badge
      break;
  }
};

// Optional keepalive: ws.send("ping") occasionally (server ignores payload)
```

### Event payloads (shape)

All frames: `{ "type": "<name>", "payload": { ... } }`.

| type | payload (main fields) |
|---|---|
| `presence.snapshot` | `{ online: Peer[] }` — your follows currently online |
| `presence.online` / `offline` | peer card + `is_online` |
| `message.created` | message fields + conversation context |
| `conversation.read` | `{ conversation_id, user_id, last_read_message_id, ... }` |
| `notification.created` | notification row |

No typing indicators (out of scope).

### Offline behaviour

Messages are always persisted in Postgres. If the peer is offline, they load history via REST on next open; WS is additive.

## Implementing Chat

1. On mount: connect WS; `GET /conversations`.
2. Select thread → `GET …/messages` + `POST …/read`.
3. Composer → `POST /messages` with `to_login` (or known peer).
4. On `message.created`, merge into state / refetch.
5. Show `peer.is_online` from conversation list + presence events.
