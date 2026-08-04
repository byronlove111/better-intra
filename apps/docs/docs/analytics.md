# Analytics logtime

Totaux, jours actifs, weekday — plus exports CSV / PDF via `fetch` + blob.

Auth : JWT + Intra lié. Plage défaut : **30 jours**. Helper : [`api()`](./getting-started#helper-api).

## Stats JSON

```js
const stats = await api("/analytics/logtime");

const ranged = await api(
  "/analytics/logtime?begin_at=2026-07-01T00:00:00Z&end_at=2026-08-01T00:00:00Z",
);

const bars = stats.by_weekday.map((d) => [d.weekday_name, d.duration_hours]);
```

| Champ | |
|---|---|
| `total_hours` / `total_seconds` | Totaux |
| `active_days` | Jours avec présence |
| `average_hours_per_active_day` | Moyenne |
| `days[]` | Par date |
| `by_weekday[]` | `weekday` 0=lun, `weekday_name`, `duration_hours` |
| `by_week[]` | Buckets hebdo |

## Exports CSV / PDF

```js
async function download(path, filename) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

await download("/analytics/logtime/export.csv", "logtime.csv");
await download("/analytics/logtime/export.pdf", "logtime.pdf");
```

Mêmes query `begin_at` / `end_at` optionnels sur les exports.

## Recette page Logtime

1. `api("/analytics/logtime")` → KPIs + barres  
2. Boutons → `download(…)`  
3. Date picker → query params  
4. Sessions brutes : `api("/me/intra/logtime")`  

## Suite

- [Proxy Intra](./intra-proxy)  
- [Cookbook front](./frontend-cookbook)  
