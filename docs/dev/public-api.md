# Public API (events + API keys)

Major module: personal API keys + CRUD on BetterIntra events at `/api/v1/events`.

## Manage keys (JWT)

```bash
# Create — raw key returned ONCE
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
// show created.key once; store securely client-side / secrets manager
```

Keys are hashed at rest (SHA-256). Rate limit: per key, per minute (`API_KEY_RATE_LIMIT_PER_MINUTE`, default 60).

## Call `/api/v1/events` with `X-API-Key`

No JWT. Header: `X-API-Key: <raw key>`.

### List

```bash
curl -s "$API/api/v1/events?limit=20" -H "X-API-Key: $API_KEY"
```

### Create

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

Scoped to the **key owner’s** events.

## Front settings page (suggested)

1. List keys (`prefix`, dates) — never re-show raw secret.
2. Create → modal with copy-once raw key.
3. Revoke → `DELETE /api-keys/{id}`.
4. Link to Swagger `/docs` tag `public-api`.

OpenAPI counts as the Major’s documentation requirement.
