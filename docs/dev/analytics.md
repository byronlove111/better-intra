# Analytics (logtime)

Base path: `/analytics`  
Auth: JWT + Intra linked.

Aggregates Intra location sessions (default range: last **30 days**).

## JSON stats

```bash
curl -s "$API/analytics/logtime" -H "Authorization: Bearer $TOKEN"

# custom range (ISO)
curl -s "$API/analytics/logtime?begin_at=2026-07-01T00:00:00Z&end_at=2026-08-01T00:00:00Z" \
  -H "Authorization: Bearer $TOKEN"
```

Important fields:

| Field | |
|---|---|
| `total_hours` / `total_seconds` | Totals |
| `active_days` | Days with presence |
| `average_hours_per_active_day` | Average |
| `days[]` | Per calendar day |
| `by_weekday[]` | `weekday` 0=Mon … `weekday_name`, `duration_hours` |
| `by_week[]` | Weekly buckets |

```ts
const stats = await api<LogtimeAnalytics>("/analytics/logtime");
// chart stats.by_weekday.map(d => [d.weekday_name, d.duration_hours])
```

## Export CSV / PDF

Binary downloads (not JSON):

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

Same optional `begin_at` / `end_at` query params as JSON.

## Implementing Logtime page

1. `GET /analytics/logtime` → KPI cards + weekday bars.
2. Buttons CSV / PDF → blob download.
3. Optional date range picker → pass query params.
4. Raw sessions (if needed): `GET /me/intra/logtime`.
