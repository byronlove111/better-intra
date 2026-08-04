# Events (JWT)

L’Agenda BetterIntra ne doit pas forcer le front à merger lui-même deux APIs. `GET /events` renvoie un **feed unifié** : events campus Intra + events créés chez nous, normalisés avec un `source`, un id composite, et un flag `can_edit` pour savoir si l’UI peut proposer patch/delete.

Auth : JWT. Sans Intra lié, la partie Intra est simplement vide ; tu peux quand même créer et gérer des events BetterIntra.

## Lire l’agenda

Par défaut, sans plage de dates, l’API te donne l’**upcoming** (`begin_at` dans le futur). Tu peux filtrer avec `q` (recherche titre), `sources` (répéter le query param pour `intra` et/ou `betterintra`), `kind` pour les kinds Intra, et paginer avec `limit` / `offset`.

Chaque item a un `id` du genre `intra:123` ou `betterintra:9`, un `external_id` (l’id brut dans la source), et `can_edit` à `true` seulement sur tes events BI. C’est ce flag qui pilote les boutons d’édition — pas une heuristique maison.

```js
const agenda = await fetch("http://localhost:8000/events?limit=20", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());

const filtered = await fetch(
  "http://localhost:8000/events?q=impro&limit=50&sources=intra&sources=betterintra",
  { headers: { Authorization: `Bearer ${access_token}` } },
).then((r) => r.json());
```

## Créer un event BetterIntra

`POST /events` crée un event stocké chez nous. Tu envoies titre, dates ISO, et optionnellement description / lieu. `end_at` doit être strictement après `begin_at`, sinon **422**. La réponse est un `EventOut` avec un **id numérique** (celui que tu réutilises pour patch/delete).

Créer un event notifie les autres users BetterIntra (`type: event`) : c’est voulu pour faire vivre le social autour de l’orga, pas seulement un calendrier silencieux.

```js
const created = await fetch("http://localhost:8000/events", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    title: "Study session",
    description: "Optional",
    location: "Cluster",
    begin_at: "2026-08-10T18:00:00+02:00",
    end_at: "2026-08-10T20:00:00+02:00",
  }),
}).then((r) => r.json());
```

## Modifier ou supprimer

Les mutations portent sur l’id numérique BI (`/events/9`), pas sur la forme composite `betterintra:9`. En pratique, depuis le feed, tu prends `item.external_id` quand `source === "betterintra"`. Seul le créateur peut muter ; sinon attends-toi à 403/404.

```js
await fetch("http://localhost:8000/events/9", {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ title: "Study session (moved)" }),
});

await fetch("http://localhost:8000/events/9", {
  method: "DELETE",
  headers: { Authorization: `Bearer ${access_token}` },
});
```

Pour des scripts / automation hors front JWT, le Major public API est documenté à part : [API publique](./public-api).

Suite : [Notifications](./notifications) (les notifs d’event), [Cookbook front](./frontend-cookbook).
