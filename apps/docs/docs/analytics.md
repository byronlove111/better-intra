# Analytics logtime

Totaux, jours actifs, répartition weekday — plus exports CSV / PDF. Plage défaut : **30 derniers jours**.

Auth : JWT + Intra lié.

## Stats JSON

```bash
curl -s "$API/analytics/logtime" -H "Authorization: Bearer $TOKEN"

curl -s "$API/analytics/logtime?begin_at=2026-07-01T00:00:00Z&end_at=2026-08-01T00:00:00Z" \
  -H "Authorization: Bearer $TOKEN"
```

| Champ | |
|---|---|
| `total_hours` / `total_seconds` | Totaux |
| `active_days` | Jours avec présence |
| `average_hours_per_active_day` | Moyenne |
| `days[]` | Par date |
| `by_weekday[]` | `weekday` 0=lun, `weekday_name`, `duration_hours` |
| `by_week[]` | Buckets hebdo |

```ts
const stats = await api<LogtimeAnalytics>("/analytics/logtime");
const bars = stats.by_weekday.map((d) => [d.weekday_name, d.duration_hours]);
```

## Exports

Réponses binaires :

```bash
curl -s "$API/analytics/logtime/export.csv" \
  -H "Authorization: Bearer $TOKEN" -o logtime.csv

curl -s "$API/analytics/logtime/export.pdf" \
  -H "Authorization: Bearer $TOKEN" -o logtime.pdf
```

```ts
async function download(path: string, filename: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

await download("/analytics/logtime/export.pdf", "logtime.pdf");
```

Mêmes `begin_at` / `end_at` optionnels.

## Recette page Logtime

1. `GET /analytics/logtime` → KPIs + barres  
2. Boutons CSV / PDF → blob download  
3. Date picker → query params  
4. Sessions brutes si besoin : `GET /me/intra/logtime`  

## Suite

- [Proxy Intra](./intra-proxy)  
- [Cookbook front](./frontend-cookbook)  
