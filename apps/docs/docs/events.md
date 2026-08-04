# Events (JWT)

Un seul feed calendrier : campus Intra + events BetterIntra. CRUD BI via JWT.

Auth : JWT. Sans Intra, la partie Intra est vide ; les events BI restent disponibles.

## Lister l’agenda

```bash
curl -s "$API/events?limit=20" -H "Authorization: Bearer $TOKEN"

curl -s "$API/events?q=impro&limit=50&offset=0&sources=intra&sources=betterintra" \
  -H "Authorization: Bearer $TOKEN"
```

| Param | Rôle |
|---|---|
| `sources` | Répétable : `intra`, `betterintra` |
| `begin_at` / `end_at` | ISO ; défaut = à venir |
| `q` | Recherche titre |
| `kind` | Filtre kind Intra |
| `limit` / `offset` | Pagination |

```json
{
  "items": [
    {
      "id": "intra:123",
      "source": "intra",
      "external_id": "123",
      "title": "42 Impro",
      "begin_at": "…",
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
const agenda = await api<Agenda>(`/events?limit=40&q=${encodeURIComponent(q)}`);
// item.can_edit → afficher edit / delete
```

## Créer un event BI

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

- `end_at` doit être après `begin_at` sinon **422**  
- Notifie les autres users BI (`type: event`)  
- Réponse : `EventOut` avec `id` **numérique** BI  

## Get / patch / delete

Utilise l’id numérique (`9`), pas `betterintra:9`.

```bash
curl -s "$API/events/9" -H "Authorization: Bearer $TOKEN"

curl -s -X PATCH "$API/events/9" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Study session (moved)"}'

curl -s -X DELETE "$API/events/9" \
  -H "Authorization: Bearer $TOKEN" -o /dev/null -w "%{http_code}\n"
```

Seul le créateur peut muter.

## Recette Agenda

1. `GET /events` + filtres  
2. Formulaire → `POST /events`  
3. Si `source === "betterintra" && can_edit` → PATCH/DELETE via `external_id`  
4. Automation externe → [API publique](./public-api)  

## Suite

- [API publique](./public-api)  
- [Notifications](./notifications)  
- [Cookbook front](./frontend-cookbook)  
