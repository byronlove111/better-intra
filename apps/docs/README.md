# `apps/docs` — Docusaurus (self-hosté)

Documentation développeur de l’API BetterIntra (auth, Intra, events, chat, analytics…).

## Lancer

```bash
cd apps/docs
pnpm install
pnpm exec docusaurus start --port 3001
```

→ http://localhost:3001

(`pnpm start` seul = port **3000**, souvent déjà pris par le front.)

Swagger (contrat machine) : API allumée → http://localhost:8000/docs

## Build static

```bash
pnpm build
pnpm serve
```

Sortie : `apps/docs/build/` (prêt pour nginx).

## Contenu

Édite les pages dans **`apps/docs/docs/`** (français).  
Sidebar : `sidebars.ts` · config / thème : `docusaurus.config.ts`, `src/css/custom.css`.
