# Notifications

Base path: `/notifications`  
Auth: JWT + Intra linked.

## Model

Simple inbox — **no** read/unread flags, **no** mute.

| Field | |
|---|---|
| `type` | `dm` \| `follow` \| `event` \| `announcement` |
| `body` | Human text |
| `url` | Front path to open (e.g. `/chat`, `/agenda`) |
| `created_at` | Timestamp |

Auto-purge after **7 days**.

## List

```bash
curl -s "$API/notifications?limit=50" -H "Authorization: Bearer $TOKEN"
# { "items": [ { "id", "type", "body", "url", "created_at" }, ... ] }
```

```ts
const { items } = await api<{ items: Notification[] }>("/notifications?limit=50");
```

## When rows are created (server hooks)

| Trigger | Recipient | Typical `type` |
|---|---|---|
| Someone DMs you | You | `dm` |
| Someone follows you (BI account) | You | `follow` |
| Someone creates a BI event | All other BI users | `event` |

Also pushed live: WS `notification.created` with the same payload shape.

## Implementing Notifications centre

1. Page: `GET /notifications`.
2. Badge: `items.length` (or count since last visit — client-side only).
3. Click row → `navigate(notification.url)`.
4. Keep WS subscription to prepend new items + toast.
