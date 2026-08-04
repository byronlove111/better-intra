# Chat & temps réel

Auth : JWT + Intra lié. Les deux pairs doivent être BetterIntra + Intra liés pour DM.

## Conversations

```bash
curl -s "$API/conversations" -H "Authorization: Bearer $TOKEN"
curl -s "$API/conversations/3" -H "Authorization: Bearer $TOKEN"
```

`ConversationOut` inclut `peer` (`login`, `is_online`, …), `last_message`, `unread_count`, curseurs de lecture.

## Messages

Pagination curseur : page oldest → newest ; passer `before_id` pour l’historique plus ancien.

```bash
curl -s "$API/conversations/3/messages?limit=50" -H "Authorization: Bearer $TOKEN"
curl -s "$API/conversations/3/messages?limit=50&before_id=100" \
  -H "Authorization: Bearer $TOKEN"
```

## Envoyer un DM

Crée le thread 1:1 au premier message.

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
// msg.conversation_id → ouvrir le thread ; push WS + notif au destinataire
```

| Status | |
|---|---|
| 201 | Envoyé |
| 403 | Peer non Intra-lié / bloqué / soi-même |
| 404 | Login inconnu |

## Marquer comme lu

```bash
curl -s -X POST "$API/conversations/3/read" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{}'
# optionnel : { "message_id": 42 }
```

Appeler quand l’utilisateur ouvre le thread. Émet WS `conversation.read` vers le peer.

## Blocks

```bash
curl -s "$API/blocks" -H "Authorization: Bearer $TOKEN"
curl -s -X POST "$API/blocks/dmpeer" -H "Authorization: Bearer $TOKEN"
curl -s -X DELETE "$API/blocks/dmpeer" -H "Authorization: Bearer $TOKEN" -o /dev/null -w "%{http_code}\n"
```

## Présence REST

```bash
curl -s "$API/presence" -H "Authorization: Bearer $TOKEN"
```

Online **parmi tes follows** seulement — [amis & présence](./friends-presence).

## WebSocket

```
ws://localhost:8000/ws?token=<access_jwt>
```

(ou `wss://` en prod). Intra requis (`4403` sinon). Token manquant/invalide → `4401`.

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
      // maj amis online
      break;
    case "message.created":
      // append si conversation ouverte ; bump inbox
      break;
    case "conversation.read":
      // maj read receipt du peer
      break;
    case "notification.created":
      // toast + badge
      break;
  }
};

// Keepalive optionnel : ws.send("ping") de temps en temps (le serveur ignore le payload)
```

### Payloads des events (forme)

Tous les frames : `{ "type": "<name>", "payload": { ... } }`.

| type | payload (champs principaux) |
|---|---|
| `presence.snapshot` | `{ online: Peer[] }` — tes follows actuellement online |
| `presence.online` / `offline` | carte peer + `is_online` |
| `message.created` | champs message + contexte conversation |
| `conversation.read` | `{ conversation_id, user_id, last_read_message_id, ... }` |
| `notification.created` | ligne notification |

Pas d’indicateurs de typing (hors scope).

### Comportement offline

Les messages sont toujours persistés en Postgres. Si le peer est offline, il charge l’historique via REST à la prochaine ouverture ; le WS est additif.

## Implémenter le Chat

1. Au mount : connecter le WS ; `GET /conversations`.
2. Sélectionner un thread → `GET …/messages` + `POST …/read`.
3. Composer → `POST /messages` avec `to_login` (ou peer connu).
4. Sur `message.created`, merger dans le state / refetch.
5. Afficher `peer.is_online` depuis la liste + events presence.
