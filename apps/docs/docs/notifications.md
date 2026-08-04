# Notifications

Base path : `/notifications`  
Auth : JWT + Intra lié.

## Modèle

Inbox simple — **pas** de flags lu/non-lu, **pas** de mute.

| Champ | |
|---|---|
| `type` | `dm` \| `follow` \| `event` \| `announcement` |
| `body` | Texte humain |
| `url` | Path front à ouvrir (ex. `/chat`, `/agenda`) |
| `created_at` | Timestamp |

Purge auto après **7 jours**.

## Lister

```bash
curl -s "$API/notifications?limit=50" -H "Authorization: Bearer $TOKEN"
# { "items": [ { "id", "type", "body", "url", "created_at" }, ... ] }
```

```ts
const { items } = await api<{ items: Notification[] }>("/notifications?limit=50");
```

## Quand les lignes sont créées (hooks serveur)

| Trigger | Destinataire | `type` typique |
|---|---|---|
| Quelqu’un te DM | Toi | `dm` |
| Quelqu’un te follow (compte BI) | Toi | `follow` |
| Quelqu’un crée un event BI | Tous les autres users BI | `event` |

Aussi poussé en live : WS `notification.created` avec la même forme de payload.

## Implémenter le centre de notifications

1. Page : `GET /notifications`.
2. Badge : `items.length` (ou compteur depuis dernière visite — côté client seulement).
3. Clic sur une ligne → `navigate(notification.url)`.
4. Garder le WS pour prepend + toast.
