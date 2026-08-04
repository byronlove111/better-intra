# Authentification

L’auth BetterIntra a deux étages. D’abord un compte local email/password qui te donne des JWT et te permet d’exister dans notre Postgres. Ensuite, optionnellement, un lien OAuth vers Intra 42 qui débloque la lecture des data école et la plupart des features sociales. Cette page explique à quoi sert chaque étape.

## Register et login

`POST /auth/register` crée le compte. Le password doit faire au moins huit caractères ; il est immédiatement hashé en Argon2id, jamais stocké en clair. La réponse te donne déjà une session complète (access + refresh + objet user), pour enchaîner sans second round-trip.

`POST /auth/login` fait la même chose pour un compte existant. Un mauvais couple email/password renvoie **401** avec un message volontairement vague (« Invalid email or password ») pour ne pas fuiter si l’email existe. Un email déjà pris au register renvoie **409**.

```js
const data = await fetch("http://localhost:8000/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "alice@student.42.fr",
    password: "alicepass1",
  }),
}).then((r) => r.json());
// data.access_token, data.refresh_token, data.user

const session = await fetch("http://localhost:8000/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "alice@student.42.fr",
    password: "alicepass1",
  }),
}).then((r) => r.json());
```

## À quoi servent access et refresh

L’access token est court (~60 minutes) et part dans `Authorization: Bearer …` sur presque toutes les routes. Le refresh dure plus longtemps (~30 jours) et ne sert qu’à obtenir une nouvelle paire sans redemander le password. Quand l’access expire, tu appelles `POST /auth/refresh` avec le refresh en body. Si le refresh échoue aussi, la session est morte.

```js
const data = await fetch("http://localhost:8000/auth/refresh", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ refresh_token }),
}).then((r) => r.json());
```

## Savoir qui est connecté

`GET /auth/me` renvoie la carte compte liée au JWT : email, login Intra s’il est déjà lié, avatar, flag `is_intra_linked`. Pour l’écran Profil complet (bio BetterIntra + objet `intra` imbriqué), passe plutôt par `GET /users/me` documenté dans [Users & profils](./users-profiles).

```js
const user = await fetch("http://localhost:8000/auth/me", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());
```

## Lier Intra 42 — pourquoi et comment

Sans ce lien, friends, chat, proxy campus, présence, notifications et analytics répondent **403**. Ce n’est pas une option cosmétique : c’est le passage obligé pour toute feature qui lit 42 ou qui suppose une identité école.

Le flux est un redirect navigateur classique. Déjà authentifié en JWT, tu appelles `GET /auth/42`. L’API construit une URL d’autorisation Intra (avec un `state` signé qui rattache le flow à ton user BI) et te la renvoie. Tu fais `window.location = authorize_url`. L’élève accepte sur Intra ; Intra rappelle alors `GET /auth/callback` sur **notre** API (pas la SPA). Le serveur échange le `code`, stocke les tokens 42 sur le user, et redirige vers `FRONTEND_URL/?intra=linked` (ou `/?intra=error&reason=…` en cas d’échec / refus).

```js
const { authorize_url } = await fetch("http://localhost:8000/auth/42", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());

window.location.href = authorize_url;
```

:::warning
N’appelle jamais `/auth/callback` toi-même depuis le front. Seul le navigateur, renvoyé par 42, doit y atterrir.
:::

Côté serveur il faut `FORTY_TWO_CLIENT_ID`, `FORTY_TWO_CLIENT_SECRET`, un `FORTY_TWO_REDIRECT_URI` qui matche exactement la config de l’app Intra, et `FRONTEND_URL` pour savoir où renvoyer l’utilisateur.

Après un lien réussi, `GET /auth/me` (ou `/users/me`) montre un `login`, un `forty_two_id`, et `is_intra_linked: true`.

Suite logique : [Users & profils](./users-profiles) pour peupler l’UI une fois la session posée, et [Proxy Intra](./intra-proxy) dès que le lien 42 est fait.
