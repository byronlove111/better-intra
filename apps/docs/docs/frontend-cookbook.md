# Cookbook front

Cette page relie chaque écran du CDC aux routes utiles. Elle ne dit pas comment organiser ton client HTTP — juste **quelle URL appeler** et pourquoi. Les guides détaillés restent la référence pour les payloads et les cas d’erreur.

Base locale des exemples : `http://localhost:8000`. Routes protégées → header `Authorization: Bearer <access_token>`.

## Transverse

Au boot, `GET /auth/me` ou `GET /users/me` restaure la session. Un **401** sur une route JWT se résout en général via `POST /auth/refresh` ; si le refresh échoue aussi, la session est morte. Un **403** sur une feature campus/sociale signifie presque toujours qu’Intra n’est pas lié → `GET /auth/42` puis redirect. Le live (présence, DM, notifs) passe par **un** WebSocket `ws://localhost:8000/ws?token=…` — voir [Chat & temps réel](./chat-realtime).

<div class="doc-cards">
  <a class="doc-card" href="/auth"><strong>Auth</strong><span>Login, refresh, OAuth.</span></a>
  <a class="doc-card" href="/chat-realtime"><strong>Realtime</strong><span>WS events à brancher.</span></a>
  <a class="doc-card" href="/architecture"><strong>Architecture</strong><span>Pourquoi JWT vs Intra vs clé API.</span></a>
</div>

## Login / Signup

Créer ou ouvrir une session locale. La réponse porte access + refresh.

```js
const data = await fetch("http://localhost:8000/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
}).then((r) => r.json());
```

## Dashboard

Synthèse CDC : niveau/wallet Intra, prochains events, aperçu notifs.

```js
const [intra, agenda, notifs] = await Promise.all([
  fetch("http://localhost:8000/me/intra", {
    headers: { Authorization: `Bearer ${access_token}` },
  }).then((r) => r.json()),
  fetch("http://localhost:8000/events?limit=5", {
    headers: { Authorization: `Bearer ${access_token}` },
  }).then((r) => r.json()),
  fetch("http://localhost:8000/notifications?limit=5", {
    headers: { Authorization: `Bearer ${access_token}` },
  }).then((r) => r.json()),
]);
```

## Profil

Toi : `GET` / `PATCH /users/me`. Autre login : `GET /users/{login}`, follow via `POST /friends/{login}`. Recherche élèves : `GET /intra/users?q=`.

```js
const me = await fetch("http://localhost:8000/users/me", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());

await fetch("http://localhost:8000/users/me", {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ bio }),
});

const other = await fetch(`http://localhost:8000/users/${login}`, {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());
```

## Projets et évaluations

Proxy Intra pur : listes paginées, lecture seule.

```js
const projects = await fetch("http://localhost:8000/me/intra/projects", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());

const evals = await fetch("http://localhost:8000/me/intra/evaluations", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());
```

## Agenda

Un seul feed Intra + BetterIntra. Création / édition BI sur l’id numérique quand `can_edit` est vrai.

```js
const agenda = await fetch(
  `http://localhost:8000/events?q=${encodeURIComponent(q)}&limit=40`,
  { headers: { Authorization: `Bearer ${access_token}` } },
).then((r) => r.json());

await fetch("http://localhost:8000/events", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(eventPayload),
});
```

## Logtime

KPIs via `/analytics/logtime`. Exports CSV/PDF : voir [Analytics](./analytics) (réponse fichier, pas JSON).

```js
const stats = await fetch("http://localhost:8000/analytics/logtime", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());
```

## Amis

Following / followers / présence. Live via events WS `presence.*`.

```js
const following = await fetch("http://localhost:8000/friends/following", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());

const { online } = await fetch("http://localhost:8000/presence", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());
```

## Chat

Conversations, messages, mark read, envoi. Live : `message.created`, `conversation.read`.

```js
const conversations = await fetch("http://localhost:8000/conversations", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());

const messages = await fetch(
  `http://localhost:8000/conversations/${id}/messages?limit=50`,
  { headers: { Authorization: `Bearer ${access_token}` } },
).then((r) => r.json());

await fetch(`http://localhost:8000/conversations/${id}/read`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({}),
});

await fetch("http://localhost:8000/messages", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ to_login, body }),
});
```

## Notifications

Liste REST + event WS `notification.created`. Pas de mark-as-read.

```js
const { items } = await fetch(
  "http://localhost:8000/notifications?limit=50",
  { headers: { Authorization: `Bearer ${access_token}` } },
).then((r) => r.json());
```

## Settings — clés API

Créer (secret une seule fois), lister les prefixes, révoquer. Automation : `X-API-Key` sur `/api/v1/events` — [API publique](./public-api).

```js
const keys = await fetch("http://localhost:8000/api-keys", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());

const created = await fetch("http://localhost:8000/api-keys", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ name }),
}).then((r) => r.json());

await fetch(`http://localhost:8000/api-keys/${id}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${access_token}` },
});
```

## Codes HTTP utiles

Un **401** veut dire JWT à rafraîchir ou login. Un **403** sur une feature campus/sociale veut presque toujours dire « lie Intra ». Un **404** est une ressource absente. Un **409** est un conflit métier. Un **422** est une validation de body (`detail`). Un **429** sur la public API, c’est le rate limit de la clé.

## Pas encore là

`GET /recommendations` (peer reco) est **hors scope** CDC v1.11 — pas de page dédiée prévue.
