# API publique

Expose un CRUD events BetterIntra authentifié par **clé API** — module Major Web public API.

## Clés (JWT)

```bash
curl -s -X POST "$API/api-keys" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"ci-bot"}'
```

```json
{
  "id": 1,
  "name": "ci-bot",
  "prefix": "bi_ab12",
  "key": "bi_ab12••••••••",
  "created_at": "…"
}
```

:::danger Une seule fois
Le champ `key` (brut) n’apparaît qu’à la création. Ensuite tu ne vois que le `prefix`.
:::

```bash
curl -s "$API/api-keys" -H "Authorization: Bearer $TOKEN"
curl -s -X DELETE "$API/api-keys/1" -H "Authorization: Bearer $TOKEN"
```

- Stockage : hash SHA-256  
- Rate limit : par clé / minute (`API_KEY_RATE_LIMIT_PER_MINUTE`, défaut 60)

## Events `/api/v1/events`

Header : `X-API-Key: <clé brute>` — **pas** de JWT. Scopé au propriétaire de la clé.

### List / create

```bash
curl -s "$API/api/v1/events?limit=20" -H "X-API-Key: $API_KEY"

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

### Get / put / delete

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

curl -s -X DELETE "$API/api/v1/events/9" -H "X-API-Key: $API_KEY"
```

Les **5** endpoints Major + OpenAPI (`/docs`) + rate limit = exigences du sujet.

## Recette settings front

1. Lister clés (prefix + dates)  
2. Créer → modal « copie maintenant »  
3. Révoquer → `DELETE`  
4. Lien Swagger tag `public-api`  

## Suite

- [Events JWT](./events) (feed front)  
- [Architecture](./architecture)  
