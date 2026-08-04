# API publique (events + clés API)

Module Major : clés API personnelles + CRUD events BetterIntra sur `/api/v1/events`.

## Gérer les clés (JWT)

```bash
# Créer — la clé brute n’est renvoyée QU’UNE FOIS
curl -s -X POST "$API/api-keys" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"ci-bot"}'
# { "id": 1, "name": "ci-bot", "prefix": "bi_ab12", "key": "bi_ab12....", "created_at": "…" }

curl -s "$API/api-keys" -H "Authorization: Bearer $TOKEN"

curl -s -X DELETE "$API/api-keys/1" -H "Authorization: Bearer $TOKEN"
```

```ts
const created = await api<{ key: string; id: number }>("/api-keys", {
  method: "POST",
  body: JSON.stringify({ name: "my-script" }),
});
// afficher created.key une fois ; stocker en secrets manager / local sécurisé
```

Les clés sont hashées au repos (SHA-256). Rate limit : par clé, par minute (`API_KEY_RATE_LIMIT_PER_MINUTE`, défaut 60).

## Appeler `/api/v1/events` avec `X-API-Key`

Pas de JWT. Header : `X-API-Key: <clé brute>`.

### Lister

```bash
curl -s "$API/api/v1/events?limit=20" -H "X-API-Key: $API_KEY"
```

### Créer

```bash
curl -s -X POST "$API/api/v1/events" \
  -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Public API event",
    "description": "from script",
    "location": "Lab",
    "begin_at": "2026-08-12T10:00:00Z",
    "end_at": "2026-08-12T11:00:00Z"
  }'
```

### Get / replace / delete

```bash
curl -s "$API/api/v1/events/9" -H "X-API-Key: $API_KEY"

curl -s -X PUT "$API/api/v1/events/9" \
  -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Updated",
    "description": null,
    "location": "Lab",
    "begin_at": "2026-08-12T10:00:00Z",
    "end_at": "2026-08-12T12:00:00Z"
  }'

curl -s -X DELETE "$API/api/v1/events/9" -H "X-API-Key: $API_KEY" -o /dev/null -w "%{http_code}\n"
```

Scopé aux events du **propriétaire de la clé**.

## Page settings front (suggestion)

1. Lister les clés (`prefix`, dates) — ne jamais re-afficher le secret.
2. Créer → modal copie-une-fois de la clé brute.
3. Révoquer → `DELETE /api-keys/{id}`.
4. Lien vers Swagger `/docs` tag `public-api`.

OpenAPI compte comme la doc exigée par le Major.
