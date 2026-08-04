# Proxy Intra

Le proxy Intra existe pour une raison simple : le navigateur ne doit jamais parler à `api.intra.42.fr`. Toutes les lectures école passent par notre backend, qui utilise les tokens OAuth stockés sur l’utilisateur. C’est de la **lecture seule** — BetterIntra n’écrit rien sur Intra (pas de subscribe projet, pas de vrais slots, etc.).

Auth : JWT + Intra lié.

## Ce que « mes » routes exposent

`GET /me/intra` te donne le profil école normalisé : login, displayname, wallet, points de correction, campus, cursus avec niveau et grade. C’est la source idéale des KPIs dashboard (niveau, wallet).

`GET /me/intra/projects` et `GET /me/intra/evaluations` renvoient des pages `{ items, meta }` pour peupler les écrans Projets et Évaluations : noms de projets, statuts, notes, rôle correcteur/corrigé, etc.

`GET /me/intra/logtime` expose les sessions de location brutes. Pour des totaux, des graphiques weekday et surtout l’export PDF/CSV du CDC, tu passeras plutôt par [Analytics](./analytics), qui agrège ces sessions.

`GET /me/intra/events` liste les events campus Intra bruts. Pour l’Agenda produit (Intra + BetterIntra dans un seul feed, avec recherche), utilise [Events](./events) (`GET /events`) plutôt que cette route seule.

```js
const profile = await fetch("http://localhost:8000/me/intra", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());

const projects = await fetch("http://localhost:8000/me/intra/projects", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());

const evaluations = await fetch("http://localhost:8000/me/intra/evaluations", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());
```

## Chercher un élève

`GET /intra/users?q=` fait une recherche partielle sur les logins (paramètre Intra `search[login]`). Avec `exact=true`, tu forces une égalité stricte. Une fois le login choisi, `GET /users/{login}` donne le profil produit (bio, flags BI), pas seulement la fiche Intra.

```js
const page = await fetch(
  `http://localhost:8000/intra/users?q=${encodeURIComponent(q)}&page=1&page_size=20`,
  { headers: { Authorization: `Bearer ${access_token}` } },
).then((r) => r.json());
```

## Regarder un autre élève côté Intra

Les routes `/intra/users/{login}`, `/projects`, `/evaluations`, `/logtime` proxifient la fiche d’un autre. Elles sont utiles pour une vue « raw Intra » ; pour le produit unifié (permission gate `is_betterintra_linked`, bio, online), reste sur [Users & profils](./users-profiles).

```js
const otherProjects = await fetch(
  `http://localhost:8000/intra/users/${login}/projects`,
  { headers: { Authorization: `Bearer ${access_token}` } },
).then((r) => r.json());
```

## Erreurs à prévoir

Un **403** signifie presque toujours « pas encore lié Intra » → CTA vers le flux OAuth. Les 502 / timeouts / rate limits 42 sont retryables : le proxy dépend d’un service externe.

Suite : [Events](./events) pour l’agenda unifié, [Analytics](./analytics) pour le logtime produit, [Users & profils](./users-profiles) pour les fiches.
