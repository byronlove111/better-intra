# Notifications

Inbox minimale : list via `fetch`, push live via WebSocket. Pas de lu/non-lu, pas de mute.

Auth : JWT + Intra lié. TTL **7 jours**. Helper : [`api()`](./getting-started#helper-api).

## Lister

```js
const { items } = await api("/notifications?limit=50");

// items[0] →
// { id, type: "follow"|"dm"|"event"|…, body, url, created_at }
```

| Champ | Rôle |
|---|---|
| `type` | `dm` \| `follow` \| `event` \| `announcement` |
| `body` | Texte affiché |
| `url` | Path front au clic |
| `created_at` | Horodatage |

## Quand ça se crée

| Trigger | Destinataire | `type` |
|---|---|---|
| DM reçu | Toi | `dm` |
| Follow reçu (compte BI) | Toi | `follow` |
| Event BI créé | Tous les autres BI | `event` |

Live : frame WS `notification.created` (même payload) — voir [Chat](./chat-realtime).

## Recette UI

```js
const { items } = await api("/notifications?limit=50");
setBadge(items.length);

function onNotifClick(n) {
  navigate(n.url); // ex. /chat, /friends, /agenda
}

// Sur WS notification.created → prepend + toast
```

## Suite

- [Chat & temps réel](./chat-realtime)  
- [Events](./events)  
- [Cookbook front](./frontend-cookbook)  
