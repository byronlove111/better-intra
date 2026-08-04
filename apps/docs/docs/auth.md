# Authentification

Crée un compte BetterIntra, récupère des JWT, puis lie optionnellement Intra 42 pour débloquer le campus.

## Avant de commencer

- API lancée ([Premiers pas](./getting-started))
- Pour OAuth 42 : `FORTY_TWO_CLIENT_ID`, `FORTY_TWO_CLIENT_SECRET`, `FORTY_TWO_REDIRECT_URI`, `FRONTEND_URL`

## Register

```bash
curl -s -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@student.42.fr","password":"alicepass1"}'
```

```ts
const data = await api("/auth/register", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});
// persister data.access_token + data.refresh_token
```

| Status | Quand |
|---|---|
| `201` | Compte créé + tokens |
| `409` | Email déjà enregistré |
| `422` | Email invalide ou password trop court |

Les passwords sont hashés **Argon2id** — jamais stockés en clair.

## Login

```bash
curl -s -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@student.42.fr","password":"alicepass1"}'
```

Même `TokenResponse` que le register.

## Refresh

L’access JWT expire (~60 min). Échange le refresh (~30 jours) sans redemander le password :

```bash
curl -s -X POST "$API/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"refresh_token\":\"$REFRESH\"}"
```

```ts
async function refreshSession() {
  const refresh_token = localStorage.getItem("refresh_token");
  const data = await fetch(`${API}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  }).then((r) => r.json());
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
}
```

**Pattern front :** sur `401` → refresh une fois → retry → sinon logout.

## Session courante

```bash
curl -s "$API/auth/me" -H "Authorization: Bearer $TOKEN"
```

Retourne `UserOut` (email, login, `is_intra_linked`, …).  
Pour le profil unifié de l’écran Profil, utilise plutôt [`GET /users/me`](./users-profiles).

## Lier Intra 42

Sans ce lien : friends, chat, proxy, analytics → **403**.

### Flux

1. SPA appelle `GET /auth/42` avec JWT  
2. API renvoie `authorize_url`  
3. Redirect navigateur vers Intra  
4. Intra rappelle `GET /auth/callback?code&state`  
5. API redirige vers `FRONTEND_URL/?intra=linked` (ou `intra=error`)

```bash
curl -s "$API/auth/42" -H "Authorization: Bearer $TOKEN"
# {"authorize_url":"https://api.intra.42.fr/oauth/authorize?..."}
```

```ts
const { authorize_url } = await api<{ authorize_url: string }>("/auth/42");
window.location.href = authorize_url;
```

:::warning
N’appelle **pas** `/auth/callback` depuis la SPA. Le navigateur y arrive depuis 42.
:::

Après succès, `GET /auth/me` montre `login`, `forty_two_id`, `is_intra_linked: true`.

## Recette page Login

1. Form → `POST /auth/login` ou `/register`  
2. Persister les tokens  
3. Si `!is_intra_linked` → CTA → étape OAuth  
4. Au boot → `GET /auth/me` ou `/users/me` ; refresh sur 401  

## Suite

- [Users & profils](./users-profiles)  
- [Proxy Intra](./intra-proxy)  
- [Cookbook front](./frontend-cookbook)  
