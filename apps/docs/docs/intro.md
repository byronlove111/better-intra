---
sidebar_position: 1
slug: /
---

# Documentation BetterIntra

Construis le front (ou un client) sur l’API FastAPI : auth duale, data 42 en lecture, social et temps réel chez nous.

Cette doc est pensée comme un **produit** : chaque page te dit quoi faire, pourquoi, puis te donne des exemples prêts à coller. Le contrat machine reste sur [Swagger](http://localhost:8000/docs).

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

## Conventions

Tous les exemples partent de :

```bash
export API=http://localhost:8000
export TOKEN='<access_jwt>'
```

```http
Authorization: Bearer $TOKEN
Content-Type: application/json
```

Les erreurs API sont en général `{ "detail": "..." }`.

:::tip Preview UI
Un front jetable consomme déjà l’API : [`apps/api-lab`](https://github.com/byronlove111/better-intra/tree/main/apps/api-lab) → `pnpm dev` sur http://localhost:5174
:::
