# `apps/docs` — Docusaurus (self-hosted)

Renders the markdown in [`docs/dev/`](../../docs/dev/) as a local documentation site.

## Run

```bash
cd apps/docs
pnpm install
pnpm start
# or: pnpm exec docusaurus start --port 3001
```

→ http://localhost:3000 (default)

## Build static site

```bash
pnpm build
pnpm serve
```

Output: `apps/docs/build/` (nginx-ready).

## Content workflow

1. Edit markdown under **`docs/dev/`** (source of truth).
2. Sidebar order: `apps/docs/sidebars.ts`.
3. Site config / theme: `docusaurus.config.ts`, `src/css/custom.css`.

Do **not** put long guides in `apps/docs/docs/` — that folder is unused; content lives in the repo `docs/dev/` tree.
