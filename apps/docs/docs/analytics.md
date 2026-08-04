# Analytics (logtime)

Base path : `/analytics`  
Auth : JWT + Intra lié.

Agrège les sessions de location Intra (plage par défaut : **30 derniers jours**).

## Stats JSON

```bash
curl -s "$API/analytics/logtime" -H "Authorization: Bearer $TOKEN"

# plage custom (ISO)
curl -s "$API/analytics/logtime?begin_at=2026-07-01T00:00:00Z&end_at=2026-08-01T00:00:00Z" \
  -H "Authorization: Bearer $TOKEN"
```

Champs importants :

| Champ | |
|---|---|
| `total_hours` / `total_seconds` | Totaux |
| `active_days` | Jours avec présence |
| `average_hours_per_active_day` | Moyenne |
| `days[]` | Par jour calendaire |
| `by_weekday[]` | `weekday` 0=lun … `weekday_name`, `duration_hours` |
| `by_week[]` | Buckets hebdo |

```ts
const stats = await api<LogtimeAnalytics>("/analytics/logtime");
// chart stats.by_weekday.map(d => [d.weekday_name, d.duration_hours])
```

## Export CSV / PDF

Téléchargements binaires (pas JSON) :

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
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

await download("/analytics/logtime/export.pdf", "logtime.pdf");
```

Mêmes query params optionnels `begin_at` / `end_at` que le JSON.

## Implémenter la page Logtime

1. `GET /analytics/logtime` → cartes KPI + barres par weekday.
2. Boutons CSV / PDF → download blob.
3. Date range optionnel → passer les query params.
4. Sessions brutes (si besoin) : `GET /me/intra/logtime`.
