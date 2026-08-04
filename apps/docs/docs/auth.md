# Auth

Base path : `/auth`

## Register

Crée un compte BetterIntra. Password min 8 caractères. Hashé en Argon2id.

```bash
curl -s -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@student.42.fr","password":"alicepass1"}'
```

```ts
await api("/auth/register", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});
// stocker access_token + refresh_token
```

| Status | Quand |
|---|---|
| 201 | Créé + tokens |
| 409 | Email déjà enregistré |
| 422 | Validation (email invalide / password trop court) |

## Login

```bash
curl -s -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@student.42.fr","password":"alicepass1"}'
```

Même `TokenResponse` que le register.

## Refresh

Quand l’access JWT expire (défaut ~60 min), échanger le refresh token (défaut ~30 jours) :

```bash
curl -s -X POST "$API/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"refresh_token\":\"$REFRESH\"}"
```

```ts
const data = await fetch(`${API}/auth/refresh`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ refresh_token: refreshToken }),
}).then((r) => r.json());
localStorage.setItem("access_token", data.access_token);
localStorage.setItem("refresh_token", data.refresh_token);
```

Pattern front : sur `401`, tenter un refresh une fois, retry la requête d’origine, sinon logout.

## User courant (carte compte JWT)

```bash
curl -s "$API/auth/me" -H "Authorization: Bearer $TOKEN"
```

Retourne `UserOut` (email, login, avatar, `is_intra_linked`, …).  
Pour le profil **unifié** de la page Profil, préfère `GET /users/me` ([users-profiles](./users-profiles)).

## Lier Intra (OAuth 42)

### Pourquoi

Sans ça, les features campus (proxy, friends, chat, analytics, …) renvoient **403**.

### Flux front

1. L’utilisateur est loggé (JWT).
2. Appeler `GET /auth/42`.
3. Rediriger le navigateur vers `authorize_url`.
4. L’utilisateur accepte sur Intra → 42 tape `GET /auth/callback`.
5. L’API stocke les tokens 42 sur le user et **redirige** vers `FRONTEND_URL/?intra=linked` (ou `/?intra=error&reason=...`).

```bash
curl -s "$API/auth/42" -H "Authorization: Bearer $TOKEN"
# {"authorize_url":"https://api.intra.42.fr/oauth/authorize?..."}
```

```ts
const { authorize_url } = await api<{ authorize_url: string }>("/auth/42");
window.location.href = authorize_url;
```

**Ne pas** appeler `/auth/callback` depuis la SPA — le navigateur y arrive depuis 42.

### Env requis côté API

`FORTY_TWO_CLIENT_ID`, `FORTY_TWO_CLIENT_SECRET`, `FORTY_TWO_REDIRECT_URI` (doit matcher l’app Intra), `FRONTEND_URL`.

### Après le lien

```bash
curl -s "$API/auth/me" -H "Authorization: Bearer $TOKEN"
# user.login, forty_two_id, is_intra_linked: true
```

## Implémenter une page login

1. Form → `POST /auth/login` ou `/auth/register`.
2. Persister les tokens (mémoire + `localStorage` / cookies — choix d’équipe).
3. Si `!user.is_intra_linked`, CTA « Lie ton Intra » → étape OAuth ci-dessus.
4. Au boot de l’app : `GET /auth/me` (ou `/users/me`) pour restaurer la session ; refresh sur 401.
