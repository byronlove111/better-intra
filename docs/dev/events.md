# Events (JWT — front)

Base path: `/events`  
Auth: JWT. Unified feed merges Intra campus events + BetterIntra events.

## List unified agenda

```bash
curl -s "$API/events?limit=20" -H "Authorization: Bearer $TOKEN"

# search + sources + pagination
curl -s "$API/events?q=impro&limit=50&offset=0&sources=intra&sources=betterintra" \
  -H "Authorization: Bearer $TOKEN"
```

Query params:

| Param | Notes |
|---|---|
| `sources` | Repeatable: `intra`, `betterintra` |
| `begin_at` / `end_at` | ISO datetimes; default = upcoming (`begin_at >= now`) |
| `q` | Title search |
| `kind` | Intra event kind filter |
| `limit` / `offset` | Pagination |

Response:

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
// render agenda.items; if item.can_edit → show edit/delete
```

Without Intra linked, Intra source is skipped / empty; BI events still work.

## Create BetterIntra event

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

Returns `EventOut` with numeric `id` (BI id). Creating notifies other BI users (`type: event`).

`end_at` must be after `begin_at` (422 otherwise).

## Get / patch / delete (BI only)

Paths use the **numeric** BetterIntra id (not the composite `betterintra:9`).

```bash
curl -s "$API/events/9" -H "Authorization: Bearer $TOKEN"

curl -s -X PATCH "$API/events/9" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Study session (moved)"}'

curl -s -X DELETE "$API/events/9" -H "Authorization: Bearer $TOKEN" -o /dev/null -w "%{http_code}\n"
```

Only the creator can mutate (expect 403/404 otherwise).

## Implementing Agenda

1. `GET /events` with filters for the calendar/list.
2. Create form → `POST /events`.
3. For `source === "betterintra" && can_edit` → PATCH/DELETE with `external_id` or parse id from composite.
4. For automation / external clients → [public-api](./public-api.md).
