<!-- intent-skills:start -->
## Skill Loading

Before editing files for a substantial task:
- Run `pnpm dlx @tanstack/intent@latest list` from this directory (`apps/web/`) to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing.
<!-- intent-skills:end -->

# Web package notes

This folder is the TanStack Start app for BetterIntra (`apps/web`).

**Monorepo context (stack, Docker, env, gotchas): see [`../../AGENTS.md`](../../AGENTS.md).**

Run Intent commands from **this directory**, because skills are installed with the local packages here.
