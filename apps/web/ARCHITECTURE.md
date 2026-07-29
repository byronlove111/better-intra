# Frontend architecture

## Stack

- **React + Vite** (SPA)
- **TanStack Router** (file routes in `src/routes`)
- **TanStack Query** (server state)
- **Zod** (response / form schemas)
- **Zustand** (client UI state only — e.g. theme)
- **shadcn/ui** + design tokens in `src/styles.css` (tweakcn)

## Hard rules

1. **No API calls in UI components** — `route` → `page` → `hook` → `lib/api`.
2. **No hardcoded colors in JSX** — use semantic tokens (`bg-background`, `text-muted-foreground`, …). Change look in `styles.css` only.
3. **Zustand** = client UI only. **TanStack Query** = server state.

## Layout

```text
src/
  main.tsx
  router.tsx
  styles.css
  app/providers.tsx
  components/ui/          # shadcn
  components/layout/      # header, footer, theme-toggle
  lib/utils.ts
  lib/api/                # fetch helpers + Zod parse
  hooks/                  # useQuery wrappers
  stores/                 # Zustand
  pages/                  # composition
  routes/                 # thin file routes only
```

## Commands

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # dist/
```

```bash
pnpm dlx shadcn@latest add button card …
```
