# `apps/docs` — Docusaurus (self-hosté)

Affiche le markdown de [`docs/dev/`](../../docs/dev/) en site de documentation local.

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

## Workflow contenu

1. Éditer le markdown dans **`docs/dev/`** (source de vérité, en français).
2. Ordre de la sidebar : `apps/docs/sidebars.ts`.
3. Config / thème : `docusaurus.config.ts`, `src/css/custom.css`.

Ne mets pas les guides longs dans `apps/docs/docs/` — le contenu vit dans l’arbre `docs/dev/` du repo.
