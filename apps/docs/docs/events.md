# Events (JWT — front)

Base path : `/events`  
Auth : JWT. Le feed unifié merge les events campus Intra + les events BetterIntra.

## Lister l’agenda unifié

```bash
curl -s "$API/events?limit=20" -H "Authorization: Bearer $TOKEN"

# search + sources + pagination
curl -s "$API/events?q=impro&limit=50&offset=0&sources=intra&sources=betterintra" \
  -H "Authorization: Bearer $TOKEN"
```

Query params :

| Param | Notes |
|---|---|
| `sources` | Répétable : `intra`, `betterintra` |
| `begin_at` / `end_at` | Datetimes ISO ; défaut = à venir (`begin_at >= now`) |
| `q` | Recherche sur le titre |
| `kind` | Filtre kind Intra |
| `limit` / `offset` | Pagination |

Réponse :

```json
{
  "items": [
    {
      "id": "intra:123",
      "source": "intra",
      "external_id": "123",
      "title": "42 Impro",
      "begin_at": "…",
      "end_at": "…",
      "location": "…",
      "can_edit": false
    },
    {
      "id": "betterintra:9",
      "source": "betterintra",
      "external_id": "9",
      "title": "Lab meetup",
      "can_edit": true,
      "creator_id": 7
    }
  ],
  "sources_included": ["intra", "betterintra"],
  "meta": { "limit": 20, "offset": 0, "total_returned": 2 }
}
```

```ts
const agenda = await api<Agenda>("/events?limit=40&q=" + encodeURIComponent(q));
// rendre agenda.items ; si item.can_edit → afficher edit/delete
```

Sans Intra lié, la source Intra est ignorée / vide ; les events BI marchent toujours.

## Créer un event BetterIntra

```bash
curl -s -X POST "$API/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Study session",
    "description": "Optional",
    "location": "Cluster",
    "begin_at": "2026-08-10T18:00:00+02:00",
    "end_at": "2026-08-10T20:00:00+02:00"
  }'
```

Retourne `EventOut` avec un `id` numérique (id BI). La création notifie les autres users BI (`type: event`).

`end_at` doit être après `begin_at` (422 sinon).

## Get / patch / delete (BI seulement)

Les paths utilisent l’id BetterIntra **numérique** (pas le composite `betterintra:9`).

```bash
curl -s "$API/events/9" -H "Authorization: Bearer $TOKEN"

curl -s -X PATCH "$API/events/9" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Study session (moved)"}'

curl -s -X DELETE "$API/events/9" -H "Authorization: Bearer $TOKEN" -o /dev/null -w "%{http_code}\n"
```

Seul le créateur peut muter (403/404 sinon).

## Implémenter l’Agenda

1. `GET /events` avec filtres pour le calendrier/liste.
2. Formulaire de création → `POST /events`.
3. Pour `source === "betterintra" && can_edit` → PATCH/DELETE avec `external_id` ou parser l’id du composite.
4. Pour l’automation / clients externes → [API publique](./public-api).
