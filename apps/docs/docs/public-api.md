# API publique

CRUD events BetterIntra avec **clé API** (`X-API-Key`) — Major Web public API.

La gestion des clés se fait en JWT ; les appels `/api/v1/events` utilisent la clé brute.

Helper JWT : [`api()`](./getting-started#helper-api).

## Clés (JWT)

```js
const created = await api("/api-keys", {
  method: "POST",
  body: { name: "ci-bot" },
});
// created.key → À COPIER MAINTENANT (une seule fois)
// created.prefix → visible ensuite dans la liste

localStorage.setItem("api_key", created.key); // démo only — préfère un secret store

const keys = await api("/api-keys");
await api(`/api-keys/${created.id}`, { method: "DELETE" });
```

:::danger Une seule fois
Le champ `key` (brut) n’apparaît qu’à la création. Ensuite tu ne vois que le `prefix`.
:::

- Stockage serveur : hash SHA-256  
- Rate limit : par clé / minute (défaut 60)

## Events `/api/v1/events`

```js
const API = import.meta.env.VITE_API_URL;
const apiKey = localStorage.getItem("api_key"); // ou saisie utilisateur

async function publicApi(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}
```

### List / create

```js
const list = await publicApi("/api/v1/events?limit=20");

const event = await publicApi("/api/v1/events", {
  method: "POST",
  body: {
    title: "Public API event",
    description: "from script",
    location: "Lab",
    begin_at: "2026-08-12T10:00:00Z",
    end_at: "2026-08-12T11:00:00Z",
  },
});
```

### Get / put / delete

```js
const one = await publicApi(`/api/v1/events/${event.id}`);

await publicApi(`/api/v1/events/${event.id}`, {
  method: "PUT",
  body: {
    title: "Updated",
    description: null,
    location: "Lab",
    begin_at: "2026-08-12T10:00:00Z",
    end_at: "2026-08-12T12:00:00Z",
  },
});

await publicApi(`/api/v1/events/${event.id}`, { method: "DELETE" });
```

Scopé au propriétaire de la clé. Les **5** endpoints + OpenAPI + rate limit = exigences du sujet.

## Recette settings front

1. Lister clés (`api("/api-keys")`)  
2. Créer → modal « copie maintenant »  
3. Révoquer → `DELETE`  
4. Lien Swagger tag `public-api`  

## Suite

- [Events JWT](./events)  
- [Architecture](./architecture)  
