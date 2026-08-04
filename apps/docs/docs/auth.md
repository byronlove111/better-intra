# Authentification

Crée un compte BetterIntra, récupère des JWT via `fetch`, puis lie optionnellement Intra 42.

Les snippets utilisent le helper [`api()` des premiers pas](./getting-started#helper-api).

## Avant de commencer

- API lancée + `VITE_API_URL`
- Pour OAuth 42 : `FORTY_TWO_*` et `FRONTEND_URL` côté serveur

## Register

```js
const data = await api("/auth/register", {
  auth: false,
  method: "POST",
  body: { email: "alice@student.42.fr", password: "alicepass1" },
});
localStorage.setItem("access_token", data.access_token);
localStorage.setItem("refresh_token", data.refresh_token);
```

| Status | Quand |
|---|---|
| `201` | Compte créé + tokens |
| `409` | Email déjà enregistré |
| `422` | Email invalide ou password trop court |

Les passwords sont hashés **Argon2id** côté serveur.

## Login

```js
const data = await api("/auth/login", {
  auth: false,
  method: "POST",
  body: { email: "alice@student.42.fr", password: "alicepass1" },
});
localStorage.setItem("access_token", data.access_token);
localStorage.setItem("refresh_token", data.refresh_token);
```

Même forme de réponse que le register.

## Refresh

L’access JWT expire (~60 min). Échange le refresh (~30 jours) :

```js
const refresh_token = localStorage.getItem("refresh_token");
const data = await api("/auth/refresh", {
  auth: false,
  method: "POST",
  body: { refresh_token },
});
localStorage.setItem("access_token", data.access_token);
localStorage.setItem("refresh_token", data.refresh_token);
```

**Pattern front :** sur `401` → refresh une fois → retry → sinon logout.

## Session courante

```js
const user = await api("/auth/me");
// user.email, user.login, user.is_intra_linked, …
```

Pour le profil unifié de l’écran Profil → [`GET /users/me`](./users-profiles).

## Lier Intra 42

Sans ce lien : friends, chat, proxy, analytics → **403**.

### Flux

1. SPA appelle `GET /auth/42` avec JWT  
2. API renvoie `authorize_url`  
3. Redirect navigateur vers Intra  
4. Intra rappelle `GET /auth/callback?code&state`  
5. API redirige vers `FRONTEND_URL/?intra=linked` (ou `intra=error`)

```js
const { authorize_url } = await api("/auth/42");
window.location.href = authorize_url;
```

:::warning
N’appelle **pas** `/auth/callback` depuis la SPA. Le navigateur y arrive depuis 42.
:::

Après succès :

```js
const me = await api("/auth/me");
console.log(me.login, me.is_intra_linked); // true
```

## Recette page Login

1. Form → `api("/auth/login"|"/auth/register", …)`  
2. Persister les tokens  
3. Si `!is_intra_linked` → CTA OAuth  
4. Au boot → `api("/auth/me")` ; refresh sur 401  

## Suite

- [Users & profils](./users-profiles)  
- [Proxy Intra](./intra-proxy)  
- [Cookbook front](./frontend-cookbook)  
