# Premiers pas

Cette page te sort du zéro : API allumée, compte BetterIntra créé, JWT en main, première requête authentifiée. Une fois ça en place, tu peux lier Intra et brancher le reste des features.

## Ce qu’il te faut avant

L’API lit Postgres via `DATABASE_URL` dans `apps/server/.env`. Sans base joignable, même le health DB échoue. Côté navigateur, l’origine du front doit être listée dans `CORS_ORIGINS` côté API, sinon les appels cross-origin sont bloqués.

Pour démarrer le serveur localement :

```bash
cd apps/server
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Swagger vit sur http://localhost:8000/docs. Les routes `/health` et `/health/db` te disent respectivement si le process répond et si Postgres répond.

## Vérifier que l’API répond

Avant même de t’authentifier, tu peux frapper les health checks sans token. Ça isole les problèmes réseau / CORS / process down :

```js
const health = await fetch("http://localhost:8000/health").then((r) => r.json());
// { status: "ok", service: "BetterIntra API" }

const db = await fetch("http://localhost:8000/health/db").then((r) => r.json());
```

## Créer un compte ou se connecter

Le sujet impose un compte **email + password**. OAuth 42 ne remplace pas ça : c’est un lien ensuite, pour lire Intra. Au register comme au login, l’API renvoie un access JWT (courte durée) et un refresh JWT (plus long), plus un objet `user` pour peupler l’UI tout de suite.

```js
const registered = await fetch("http://localhost:8000/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "dev@example.com",
    password: "devpass42!",
  }),
}).then((r) => r.json());
// registered.access_token, registered.refresh_token, registered.user

const session = await fetch("http://localhost:8000/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "dev@example.com",
    password: "devpass42!",
  }),
}).then((r) => r.json());
```

Si l’email existe déjà au register, tu reçois un **409**. Un password trop court ou un email invalide donne **422**. Les mots de passe sont hashés Argon2id côté serveur : le clair n’est jamais stocké en BDD.

## Première route protégée

Avec l’access token, `GET /auth/me` te renvoie la carte compte (email, login éventuel, flag `is_intra_linked`). C’est le test minimal « mon Authorization marche » :

```js
const me = await fetch("http://localhost:8000/auth/me", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());

console.log(me.email, me.is_intra_linked);
```

Pour le profil unifié de l’écran Profil (bio + bloc Intra), tu préféreras plus tard `GET /users/me` — voir [Users & profils](./users-profiles).

## Quand le token expire

L’access JWT dure environ une heure. `POST /auth/refresh` échange le refresh contre une nouvelle paire, sans redemander le password. Si le refresh échoue aussi, la session est morte.

```js
const next = await fetch("http://localhost:8000/auth/refresh", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ refresh_token }),
}).then((r) => r.json());
// next.access_token, next.refresh_token
```

## Débloquer le campus (Intra)

Sans compte 42 lié, beaucoup de routes sociales et campus répondent **403** avec un message du genre « Link your Intra account first ». Le flux OAuth est décrit en détail dans [Authentification](./auth) : en résumé tu appelles `GET /auth/42` avec le Bearer, tu rediriges le navigateur vers `authorize_url`, et le callback serveur te renvoie sur le front avec `?intra=linked`.

## Suite naturelle

Lis [Architecture](./architecture) pour la matrice d’auth et le modèle mental. Puis [Authentification](./auth) pour OAuth, et le [Cookbook front](./frontend-cookbook) pour relier les écrans aux routes.
