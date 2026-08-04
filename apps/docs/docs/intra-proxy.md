# Proxy Intra

Lis les data école **sans** appeler `api.intra.42.fr` depuis le navigateur. Auth : JWT + Intra lié. Lecture seule.

Helper : [`api()`](./getting-started#helper-api).

## Moi

```js
const profile = await api("/me/intra");
const projects = await api("/me/intra/projects");
const evaluations = await api("/me/intra/evaluations");
const logtime = await api("/me/intra/logtime");
const campusEvents = await api("/me/intra/events");

const level = profile.cursus?.[0]?.level;
```

### Champs utiles

- Profil : `login`, `displayname`, `wallet`, `correction_point`, `campus[]`, `cursus[]`
- Projets (`items`) : `project_name`, `status`, `final_mark`, `validated`, `marked_at`
- Évals (`items`) : `role` (`corrector` \| `corrected`), `project_name`, `corrector_login`, `begin_at`

### Logtime & events bruts

- Sessions : `api("/me/intra/logtime")`  
- Stats + PDF/CSV → [Analytics](./analytics)  
- Agenda produit → [Events unifiés](./events) plutôt que `/me/intra/events`

## Recherche users

```js
const page = await api(`/intra/users?q=${encodeURIComponent(q)}&page=1&page_size=20`);
// page.items → naviguer vers api(`/users/${login}`)

const exact = await api(`/intra/users?q=${encodeURIComponent(login)}&exact=true`);
```

## Autre élève

```js
const other = await api(`/intra/users/${login}`);
const otherProjects = await api(`/intra/users/${login}/projects`);
const otherEvals = await api(`/intra/users/${login}/evaluations`);
const otherLogtime = await api(`/intra/users/${login}/logtime`);
```

:::tip Profil produit
Bio, flags BI, online → [`GET /users/{login}`](./users-profiles).
:::

## Recette pages

| Page | Appels |
|---|---|
| Dashboard KPIs | `api("/me/intra")` (+ events, notifs) |
| Projets | `api("/me/intra/projects")` |
| Évaluations | `api("/me/intra/evaluations")` |
| Search | `api("/intra/users?q=…")` |

Gère **403** (CTA Intra) et les 502 / rate-limit 42 comme retryables.

## Suite

- [Events](./events)  
- [Analytics](./analytics)  
- [Users & profils](./users-profiles)  
