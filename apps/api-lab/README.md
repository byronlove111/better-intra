# `apps/api-lab` — preview front (not Swan)

Product-shaped smoke UI for Malik’s API: login, dashboard, profil, projets, agenda,
évals, logtime, amis, chat/WS, notifications.

**Not** the official `apps/web` frontend.

## Run

```bash
# API on :8000
cd apps/api-lab
pnpm install
pnpm dev
```

→ http://localhost:5174

Vite proxies API + WebSocket to `http://localhost:8000`.

Test account (local): `abbouras@student.42.fr` / `abbouras42!`
