# Cookbook front

Checklist d’intégration : chaque écran CDC → appels `fetch` / `api()`.

Helper de base : [Premiers pas](./getting-started#helper-api).

## Global

| Besoin | Comment |
|---|---|
| Boot session | `api("/auth/me")` ou `api("/users/me")` |
| 401 | `api("/auth/refresh", { auth: false, method: "POST", body: { refresh_token } })` puis retry |
| Gate Intra | CTA → `api("/auth/42")` → `window.location = authorize_url` |
| Live | **Un** `WebSocket` `/ws?token=` partagé |

<div class="doc-cards">
  <a class="doc-card" href="/auth"><strong>Auth</strong><span>Login, refresh, OAuth.</span></a>
  <a class="doc-card" href="/chat-realtime"><strong>Realtime</strong><span>WS events à brancher.</span></a>
  <a class="doc-card" href="/architecture"><strong>Matrice</strong><span>JWT vs Intra vs API key.</span></a>
</div>

## Écrans

### Login / Signup

```js
const data = await api("/auth/login", {
  auth: false,
  method: "POST",
  body: { email, password },
});
localStorage.setItem("access_token", data.access_token);
localStorage.setItem("refresh_token", data.refresh_token);
navigate("/");
```

### Dashboard

```js
const [intra, agenda, notifs] = await Promise.all([
  api("/me/intra"),
  api("/events?limit=5"),
  api("/notifications?limit=5"),
]);
// optionnel : api("/presence")
```

### Profil

```js
const me = await api("/users/me");
await api("/users/me", { method: "PATCH", body: { bio } });

const other = await api(`/users/${login}`);
await api(`/friends/${login}`, { method: "POST" });
```

Search : `api("/intra/users?q=…")`.

### Projets / Évals

```js
const projects = await api("/me/intra/projects");
const evals = await api("/me/intra/evaluations");
```

### Agenda

```js
const agenda = await api(`/events?q=${encodeURIComponent(q)}&limit=40`);
await api("/events", { method: "POST", body: eventPayload });
if (item.can_edit) {
  await api(`/events/${item.external_id}`, { method: "PATCH", body: patch });
}
```

### Logtime

```js
const stats = await api("/analytics/logtime");
// PDF/CSV → voir Analytics (fetch + blob)
```

### Amis

```js
const following = await api("/friends/following");
const { online } = await api("/presence");
```

+ WS `presence.*`.

### Chat

```js
const conversations = await api("/conversations");
const messages = await api(`/conversations/${id}/messages?limit=50`);
await api(`/conversations/${id}/read`, { method: "POST", body: {} });
await api("/messages", { method: "POST", body: { to_login, body } });
```

+ WS `message.created`, `conversation.read`.

### Notifications

```js
const { items } = await api("/notifications?limit=50");
```

+ WS `notification.created`.

### Settings API keys

```js
const keys = await api("/api-keys");
const created = await api("/api-keys", { method: "POST", body: { name } });
// montrer created.key une fois
await api(`/api-keys/${id}`, { method: "DELETE" });
```

Appels automation : header `X-API-Key` sur `/api/v1/events` — [API publique](./public-api).

## Antisèche HTTP

| Code | Sens | UI |
|---|---|---|
| `401` | JWT | Refresh / login |
| `403` | Intra / droits | CTA ou toast |
| `404` | Inconnu | Empty |
| `409` | Conflit | Inline |
| `422` | Validation | Afficher `detail` |
| `429` | Rate limit clé | Backoff |

## Pas encore shippé

`GET /recommendations` — à documenter à la livraison.

## Suite

- [Premiers pas](./getting-started)  
- [Architecture](./architecture)  
