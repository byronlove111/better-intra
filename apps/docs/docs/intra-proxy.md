# Proxy Intra (lecture seule 42)

Toutes les routes : JWT + Intra lié.  
Le backend utilise les tokens 42 stockés du user. **Aucune écriture** sur Intra.

## Moi

```bash
curl -s "$API/me/intra" -H "Authorization: Bearer $TOKEN"
curl -s "$API/me/intra/projects" -H "Authorization: Bearer $TOKEN"
curl -s "$API/me/intra/events" -H "Authorization: Bearer $TOKEN"
curl -s "$API/me/intra/evaluations" -H "Authorization: Bearer $TOKEN"
curl -s "$API/me/intra/logtime" -H "Authorization: Bearer $TOKEN"
```

### Profil (`GET /me/intra`)

`IntraProfileOut` normalisé : `login`, `displayname`, `wallet`, `correction_point`, `campus[]`, `cursus[]` (avec `level`, `grade`, …).

```ts
const me = await api<IntraProfile>("/me/intra");
const level = me.cursus[0]?.level;
```

### Projets (`GET /me/intra/projects`)

Page paginée : `{ items: IntraProjectOut[], meta }`.

Champs : `project_name`, `status`, `final_mark`, `validated`, `marked_at`.

### Évaluations (`GET /me/intra/evaluations`)

Items : `role` (`corrector` | `corrected`), `project_name`, `final_mark`, `corrector_login`, `corrected_logins`, `begin_at`.

### Logtime brut (`GET /me/intra/logtime`)

Sessions de locations Intra. Pour les **stats + PDF/CSV**, préfère [analytics](./analytics).

### Events campus (`GET /me/intra/events`)

Events campus Intra bruts. Pour la page Agenda, préfère le feed unifié `GET /events` ([events](./events)).

## Chercher des users

```bash
curl -s "$API/intra/users?q=abb&page=1&page_size=20" \
  -H "Authorization: Bearer $TOKEN"

# login exact
curl -s "$API/intra/users?q=abbouras&exact=true" \
  -H "Authorization: Bearer $TOKEN"
```

```ts
const page = await api(`/intra/users?q=${encodeURIComponent(q)}`);
// page.items → naviguer vers /profile/:login ou GET /users/:login
```

## Autre user

```bash
curl -s "$API/intra/users/abbouras" -H "Authorization: Bearer $TOKEN"
curl -s "$API/intra/users/abbouras/projects" -H "Authorization: Bearer $TOKEN"
curl -s "$API/intra/users/abbouras/evaluations" -H "Authorization: Bearer $TOKEN"
curl -s "$API/intra/users/abbouras/logtime" -H "Authorization: Bearer $TOKEN"
```

Pour un **profil produit** (bio + flags BI + online), utilise `GET /users/{login}` plutôt que `/intra/users/{login}`.

## Implémenter les pages

| Page | Appels principaux |
|---|---|
| KPIs Dashboard | `GET /me/intra` (+ `/events`, `/notifications`) |
| Projets | `GET /me/intra/projects` |
| Évaluations | `GET /me/intra/evaluations` |
| Recherche users | `GET /intra/users?q=` |

Gérer **403** → CTA lier Intra. Gérer rate limits / 502 du proxy comme erreurs retryables.
