# Events (JWT)

Un seul feed calendrier : campus Intra + events BetterIntra. CRUD BI via JWT + `fetch`.

Auth : JWT. Helper : [`api()`](./getting-started#helper-api).

## Lister l’agenda

```js
const agenda = await api("/events?limit=20");

const filtered = await api(
  `/events?q=${encodeURIComponent("impro")}&limit=50&offset=0&sources=intra&sources=betterintra`,
);
```

| Param | Rôle |
|---|---|
| `sources` | Répétable : `intra`, `betterintra` |
| `begin_at` / `end_at` | ISO ; défaut = à venir |
| `q` | Recherche titre |
| `kind` | Filtre kind Intra |
| `limit` / `offset` | Pagination |

```js
for (const item of agenda.items) {
  // item.id → "intra:123" | "betterintra:9"
  // item.can_edit → afficher edit/delete (BI)
}
```

## Créer un event BI

```js
const created = await api("/events", {
  method: "POST",
  body: {
    title: "Study session",
    description: "Optional",
    location: "Cluster",
    begin_at: "2026-08-10T18:00:00+02:00",
    end_at: "2026-08-10T20:00:00+02:00",
  },
});
// created.id → numérique BI ; notifie les autres users (type: event)
```

`end_at` doit être après `begin_at` sinon **422**.

## Get / patch / delete

Utilise l’id **numérique** (`9`), pas `betterintra:9`.

```js
const one = await api("/events/9");

const patched = await api("/events/9", {
  method: "PATCH",
  body: { title: "Study session (moved)" },
});

await api("/events/9", { method: "DELETE" }); // 204
```

Seul le créateur peut muter.

## Recette Agenda

1. `api("/events?…")`  
2. Form → `POST /events`  
3. Si `can_edit` → PATCH/DELETE via `external_id`  
4. Automation → [API publique](./public-api)  

## Suite

- [API publique](./public-api)  
- [Notifications](./notifications)  
- [Cookbook front](./frontend-cookbook)  
