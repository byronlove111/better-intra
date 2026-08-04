# Analytics logtime

Le CDC demande des stats d’heures à l’école et un export PDF/CSV. Le proxy Intra te donne les sessions brutes ; **Analytics** les agrège en totaux, jours actifs, séries par jour / semaine / weekday, prêts pour des cartes KPI et un petit graphique. La plage par défaut couvre les **trente derniers jours** ; tu peux la resserrer avec `begin_at` et `end_at`.

Auth : JWT + Intra lié.

## Lire les stats

`GET /analytics/logtime` renvoie notamment `total_hours`, `active_days`, une moyenne par jour actif, le détail `days`, les buckets `by_week`, et `by_weekday` (avec `weekday_name` et `duration_hours`) — idéal pour sept barres lundi→dimanche sans reformater toi-même.

```js
const stats = await fetch("http://localhost:8000/analytics/logtime", {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());

const ranged = await fetch(
  "http://localhost:8000/analytics/logtime?begin_at=2026-07-01T00:00:00Z&end_at=2026-08-01T00:00:00Z",
  { headers: { Authorization: `Bearer ${access_token}` } },
).then((r) => r.json());
```

## Exporter CSV ou PDF

Les routes `/analytics/logtime/export.csv` et `/export.pdf` renvoient un fichier (pas du JSON). Tu récupères un blob, puis tu déclenches le download côté navigateur. Les mêmes query de dates s’appliquent.

```js
const res = await fetch("http://localhost:8000/analytics/logtime/export.csv", {
  headers: { Authorization: `Bearer ${access_token}` },
});
const blob = await res.blob();
const url = URL.createObjectURL(blob);
const a = Object.assign(document.createElement("a"), {
  href: url,
  download: "logtime.csv",
});
a.click();
URL.revokeObjectURL(url);

// même pattern pour :
// http://localhost:8000/analytics/logtime/export.pdf
```

Le PDF est déjà mis en page côté serveur (cartes KPI, barres weekday, tableaux) : le front n’a pas à générer le document.

Si tu as besoin du détail session par session, `GET /me/intra/logtime` reste disponible via le [proxy Intra](./intra-proxy), mais ce n’est pas le chemin principal du module Data Major.

Suite : [Proxy Intra](./intra-proxy), [Cookbook front](./frontend-cookbook).
