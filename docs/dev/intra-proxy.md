# Intra proxy (read-only 42)

All routes: JWT + Intra linked.  
Backend uses the user’s stored 42 tokens. **No writes** to Intra.

## Me

```bash
curl -s "$API/me/intra" -H "Authorization: Bearer $TOKEN"
curl -s "$API/me/intra/projects" -H "Authorization: Bearer $TOKEN"
curl -s "$API/me/intra/events" -H "Authorization: Bearer $TOKEN"
curl -s "$API/me/intra/evaluations" -H "Authorization: Bearer $TOKEN"
curl -s "$API/me/intra/logtime" -H "Authorization: Bearer $TOKEN"
```

### Profile (`GET /me/intra`)

Normalized `IntraProfileOut`: `login`, `displayname`, `wallet`, `correction_point`, `campus[]`, `cursus[]` (with `level`, `grade`, …).

```ts
const me = await api<IntraProfile>("/me/intra");
const level = me.cursus[0]?.level;
```

### Projects (`GET /me/intra/projects`)

Paginated page: `{ items: IntraProjectOut[], meta }`.

Fields include `project_name`, `status`, `final_mark`, `validated`, `marked_at`.

### Evaluations (`GET /me/intra/evaluations`)

Items: `role` (`corrector` | `corrected`), `project_name`, `final_mark`, `corrector_login`, `corrected_logins`, `begin_at`.

### Logtime raw (`GET /me/intra/logtime`)

Location sessions from Intra. For **stats + PDF/CSV**, prefer [analytics](./analytics.md).

### Campus events (`GET /me/intra/events`)

Raw Intra campus events. Prefer unified `GET /events` for the Agenda page ([events](./events.md)).

## Search users

```bash
curl -s "$API/intra/users?q=abb&page=1&page_size=20" \
  -H "Authorization: Bearer $TOKEN"

# exact login
curl -s "$API/intra/users?q=abbouras&exact=true" \
  -H "Authorization: Bearer $TOKEN"
```

```ts
const page = await api(`/intra/users?q=${encodeURIComponent(q)}`);
// page.items → navigate to /profile/:login or GET /users/:login
```

## Other user

```bash
curl -s "$API/intra/users/abbouras" -H "Authorization: Bearer $TOKEN"
curl -s "$API/intra/users/abbouras/projects" -H "Authorization: Bearer $TOKEN"
curl -s "$API/intra/users/abbouras/evaluations" -H "Authorization: Bearer $TOKEN"
curl -s "$API/intra/users/abbouras/logtime" -H "Authorization: Bearer $TOKEN"
```

For a **product profile** (bio + BI flags + online), use `GET /users/{login}` instead of `/intra/users/{login}`.

## Implementing pages

| Page | Primary calls |
|---|---|
| Dashboard KPIs | `GET /me/intra` (+ `/events`, `/notifications`) |
| Projets | `GET /me/intra/projects` |
| Évaluations | `GET /me/intra/evaluations` |
| User search | `GET /intra/users?q=` |

Handle **403** → CTA link Intra. Handle Intra rate limits / 502 from proxy as retryable errors.
