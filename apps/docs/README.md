# `apps/docs` — Docusaurus (self-hosté)

Documentation développeur de l’API BetterIntra.

## Lancer

```bash
cd apps/docs
pnpm install
pnpm start
# ou : pnpm exec docusaurus start --port 3001
```

→ http://localhost:3000 (défaut)

## Build static

```bash
pnpm build
pnpm serve
```

Sortie : `apps/docs/build/` (prêt pour nginx).

## Contenu

Édite les pages dans **`apps/docs/docs/`** (français).  
Sidebar : `sidebars.ts` · config / thème : `docusaurus.config.ts`, `src/css/custom.css`.
