---
sidebar_position: 1
slug: /
---

# Documentation BetterIntra

Construis le front sur l’API FastAPI : auth duale, data 42 en lecture, social et temps réel chez nous.

Cette doc est pensée comme un **produit** : chaque page te dit quoi faire, pourquoi, puis te donne des exemples **JavaScript (`fetch`)** prêts à coller. Le contrat machine reste sur [Swagger](http://localhost:8000/docs).

<div class="doc-cards">
  <a class="doc-card" href="/getting-started">
    <strong>Premiers pas</strong>
    <span>Lancer l’API, créer un compte, obtenir un JWT en moins de 5 minutes.</span>
  </a>
  <a class="doc-card" href="/frontend-cookbook">
    <strong>Cookbook front</strong>
    <span>Page → endpoints. La checklist d’intégration pour Swan.</span>
  </a>
  <a class="doc-card" href="/auth">
    <strong>Authentification</strong>
    <span>Email/password, refresh, lien OAuth 42.</span>
  </a>
  <a class="doc-card" href="/chat-realtime">
    <strong>Chat & WebSocket</strong>
    <span>DM, présence, read receipts, notifs live.</span>
  </a>
</div>

## Parcours recommandé

1. [Premiers pas](./getting-started) — tokens + health  
2. [Architecture](./architecture) — modèle mental + matrice d’auth  
3. [Auth](./auth) puis [Users & profils](./users-profiles)  
4. Le guide de la feature que tu implémentes  
5. [Cookbook front](./frontend-cookbook) pour câbler les écrans  

## Conventions JS

Tous les exemples partent de :

```js
const API = import.meta.env.VITE_API_URL; // ex. http://localhost:8000

async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = localStorage.getItem("access_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status}: ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}
```

Les erreurs API sont en général `{ "detail": "..." }`.

:::tip Preview UI
Un front jetable consomme déjà l’API : [`apps/api-lab`](https://github.com/byronlove111/better-intra/tree/main/apps/api-lab) → `pnpm dev` sur http://localhost:5174
:::
