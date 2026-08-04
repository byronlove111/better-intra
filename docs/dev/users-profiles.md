# Users & profiles

Base path: `/users`

Unified **Intra-first** profiles: any 42 login is addressable; BetterIntra fields only when linked.

## My unified profile

`GET /users/me` — JWT (Intra optional).

```bash
curl -s "$API/users/me" -H "Authorization: Bearer $TOKEN"
```

Useful fields:

| Field | Use in UI |
|---|---|
| `is_intra_linked` | Show “Lie ton Intra” CTA |
| `is_betterintra_linked` | Always `true` on `/me` |
| `intra` | Nested campus profile when linked (`null` otherwise) |
| `bio` | BetterIntra bio (only meaningful when Intra linked) |
| `is_online` | Whether *you* currently have a WS connection |
| `login`, `avatar_url`, `display_name` | Header / avatar |

```ts
const me = await api<UserProfile>("/users/me");
if (!me.is_intra_linked) showLinkIntraCta();
```

## Update bio

`PATCH /users/me` — JWT + **Intra linked** (403 otherwise).

```bash
curl -s -X PATCH "$API/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"bio":"Hello from BetterIntra"}'
```

```ts
await api("/users/me", {
  method: "PATCH",
  body: JSON.stringify({ bio: text.slice(0, 500) }),
});
```

## Profile by Intra login

`GET /users/{login}` — JWT + Intra linked.

Works for **any** 42 login (fetches Intra, upserts `intra_people`).

```bash
curl -s "$API/users/abbouras" -H "Authorization: Bearer $TOKEN"
```

```ts
const profile = await api(`/users/${login}`);

if (profile.is_betterintra_linked) {
  // show bio, BI id, DM button, is_online true/false
} else {
  // Intra-only card: follow still OK, no DM (no BI account)
}

// is_online === null → Intra-only (cannot be WS-online on BetterIntra)
```

## Implementing the Profil page

| UI piece | Endpoint |
|---|---|
| Own profile | `GET /users/me` |
| Edit bio | `PATCH /users/me` |
| Search / open other | `GET /intra/users?q=` then navigate to `/users/{login}` or `GET /users/{login}` |
| Follow button | `POST /friends/{login}` |
| Message button | only if `is_betterintra_linked` → chat `POST /messages` |
| Online badge | `profile.is_online` |

Also see [friends-presence](./friends-presence) and [intra-proxy](./intra-proxy).
