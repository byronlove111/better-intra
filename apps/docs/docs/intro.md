---
sidebar_position: 1
slug: /
---

# Documentation BetterIntra

BetterIntra, c’est une Intra moderne : un compte email/password chez nous, un lien optionnel vers l’API 42 pour lire les vraies données école, et toute la couche sociale (amis, chat, events, notifs) stockée dans notre Postgres. Cette documentation décrit le **contrat HTTP** de `apps/server` — à quoi sert chaque surface, quels headers il faut, et ce que renvoie l’API.

Les exemples sont du `fetch` JavaScript avec l’URL complète (`http://localhost:8000/...`). Adapte-les à ton stack comme tu veux. Le détail des schémas reste sur [Swagger](http://localhost:8000/docs).

<div class="doc-cards">
  <a class="doc-card" href="/getting-started">
    <strong>Premiers pas</strong>
    <span>Lancer l’API, créer un compte, obtenir un JWT.</span>
  </a>
  <a class="doc-card" href="/frontend-cookbook">
    <strong>Cookbook front</strong>
    <span>Quelle route pour quel écran du produit.</span>
  </a>
  <a class="doc-card" href="/auth">
    <strong>Authentification</strong>
    <span>Email/password, refresh, lien OAuth 42.</span>
  </a>
  <a class="doc-card" href="/chat-realtime">
    <strong>Chat & WebSocket</strong>
    <span>DM, présence et push live.</span>
  </a>
</div>

Commence par [Premiers pas](./getting-started) pour avoir un token, puis [Architecture](./architecture) pour comprendre qui a le droit d’appeler quoi. Ensuite enchaîne sur [Auth](./auth) et [Users & profils](./users-profiles), ou ouvre directement le guide de la feature. Le [Cookbook](./frontend-cookbook) relie chaque écran CDC aux routes utiles.

## Convention des exemples

Sauf mention contraire, la base locale est `http://localhost:8000`. Les routes protégées attendent `Authorization: Bearer <access_token>` — le token vient de register / login / refresh. Les erreurs JSON ressemblent en général à `{ "detail": "..." }` (string ou tableau de validation Pydantic).

:::tip Preview UI
Un front jetable consomme déjà l’API : [`apps/api-lab`](https://github.com/byronlove111/better-intra/tree/main/apps/api-lab) → `pnpm dev` sur http://localhost:5174. Utile pour voir le comportement réel pendant le dev.
:::
