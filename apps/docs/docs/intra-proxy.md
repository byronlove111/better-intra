# Proxy Intra

Lis les data école **sans jamais** appeler `api.intra.42.fr` depuis le navigateur. Auth : JWT + Intra lié. Lecture seule.

## Moi

```bash
curl -s "$API/me/intra" -H "Authorization: Bearer $TOKEN"
curl -s "$API/me/intra/projects" -H "Authorization: Bearer $TOKEN"
curl -s "$API/me/intra/evaluations" -H "Authorization: Bearer $TOKEN"
curl -s "$API/me/intra/logtime" -H "Authorization: Bearer $TOKEN"
curl -s "$API/me/intra/events" -H "Authorization: Bearer $TOKEN"
```

### Profil — `GET /me/intra`

`login`, `displayname`, `wallet`, `correction_point`, `campus[]`, `cursus[]` (`level`, `grade`, …).

```ts
const me = await api<IntraProfile>("/me/intra");
const level = me.cursus[0]?.level;
```

### Projets / évals

Pages `{ items, meta }` :

- Projets : `project_name`, `status`, `final_mark`, `validated`, `marked_at`
- Évals : `role` (`corrector` \| `corrected`), `project_name`, `corrector_login`, `begin_at`

### Logtime & events bruts

- Sessions locations : `GET /me/intra/logtime`  
- Pour **stats + PDF/CSV** → [Analytics](./analytics)  
- Events campus bruts : `GET /me/intra/events` — pour l’Agenda produit préfère [Events unifiés](./events)

## Recherche users

```bash
curl -s "$API/intra/users?q=abb&page=1&page_size=20" \
  -H "Authorization: Bearer $TOKEN"

curl -s "$API/intra/users?q=abbouras&exact=true" \
  -H "Authorization: Bearer $TOKEN"
```

```ts
const page = await api(`/intra/users?q=${encodeURIComponent(q)}`);
// → naviguer vers GET /users/:login pour le profil produit
```

## Autre élève

```bash
curl -s "$API/intra/users/abbouras" -H "Authorization: Bearer $TOKEN"
curl -s "$API/intra/users/abbouras/projects" -H "Authorization: Bearer $TOKEN"
curl -s "$API/intra/users/abbouras/evaluations" -H "Authorization: Bearer $TOKEN"
curl -s "$API/intra/users/abbouras/logtime" -H "Authorization: Bearer $TOKEN"
```

:::tip Profil produit
Bio, flags BI, online → [`GET /users/{login}`](./users-profiles), pas `/intra/users/{login}`.
:::

## Recette pages

| Page | Appels |
|---|---|
| Dashboard KPIs | `GET /me/intra` (+ events, notifs) |
| Projets | `GET /me/intra/projects` |
| Évaluations | `GET /me/intra/evaluations` |
| Search | `GET /intra/users?q=` |

Gère **403** (CTA Intra) et les 502 / rate-limit 42 comme retryables.

## Suite

- [Events](./events)  
- [Analytics](./analytics)  
- [Users & profils](./users-profiles)  
