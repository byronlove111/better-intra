# Notifications

Inbox minimale : créer côté serveur, lister côté front, pousser en live. Pas de lu/non-lu, pas de mute.

Auth : JWT + Intra lié. TTL **7 jours**.

## Lister

```bash
curl -s "$API/notifications?limit=50" -H "Authorization: Bearer $TOKEN"
```

```json
{
  "items": [
    {
      "id": 12,
      "type": "follow",
      "body": "dmpeer started following you",
      "url": "/friends",
      "created_at": "…"
    }
  ]
}
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

Live : frame WS `notification.created` (même payload).

## Recette UI

1. Page centre → `GET /notifications`  
2. Badge → `items.length` (ou compteur local)  
3. Clic → `navigate(url)`  
4. WS → prepend + toast  

## Suite

- [Chat & temps réel](./chat-realtime)  
- [Events](./events)  
- [Cookbook front](./frontend-cookbook)  
