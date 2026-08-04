# API publique

Le Major « Web public API » du sujet demande une ressource exposée hors du front JWT, avec clé API, rate limit et doc OpenAPI. Chez BetterIntra, cette ressource ce sont les **events stockés chez nous** — pas une écriture sur Intra. Tu génères une clé en étant connecté (JWT), puis tu appelles `/api/v1/events` avec `X-API-Key`.

## Pourquoi une clé API

Une clé permet à un script, un bot ou une intégration d’agir **au nom d’un user** sans embarquer son password ni son refresh JWT. Elle est hashée SHA-256 en base ; la valeur brute n’est renvoyée **qu’à la création**. Ensuite la liste ne montre qu’un `prefix` pour reconnaître la clé. Un rate limit par clé et par minute (défaut 60) protège l’API des boucles folles.

```js
const created = await fetch("http://localhost:8000/api-keys", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ name: "ci-bot" }),
}).then((r) => r.json());
// created.key n’apparaît qu’ici — à copier tout de suite

const keys = await fetch("http://localhost:8000/api-keys", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());

await fetch(`http://localhost:8000/api-keys/${created.id}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${access_token}` },
});
```

## Appeler `/api/v1/events`

Ici pas de Bearer. Tu poses `X-API-Key` avec la clé brute. Les cinq opérations du Major sont list, create, get, put (remplacement), delete — toutes scopées aux events du propriétaire de la clé.

```js
const list = await fetch("http://localhost:8000/api/v1/events?limit=20", {
  headers: { "X-API-Key": apiKey },
}).then((r) => r.json());

const event = await fetch("http://localhost:8000/api/v1/events", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  },
  body: JSON.stringify({
    title: "Public API event",
    description: "from script",
    location: "Lab",
    begin_at: "2026-08-12T10:00:00Z",
    end_at: "2026-08-12T11:00:00Z",
  }),
}).then((r) => r.json());

await fetch(`http://localhost:8000/api/v1/events/${event.id}`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  },
  body: JSON.stringify({
    title: "Updated",
    description: null,
    location: "Lab",
    begin_at: "2026-08-12T10:00:00Z",
    end_at: "2026-08-12T12:00:00Z",
  }),
});

await fetch(`http://localhost:8000/api/v1/events/${event.id}`, {
  method: "DELETE",
  headers: { "X-API-Key": apiKey },
});
```

OpenAPI sur `/docs` (tag public-api) compte comme la documentation machine exigée par le Major. Le feed front unifié (Intra + BI) reste sur [Events JWT](./events) — ce n’est pas le même use case.

Suite : [Events](./events) pour l’Agenda SPA, [Architecture](./architecture) pour la place de cette surface dans la matrice d’auth.
