---
name: tidy
description: Find leftovers in Para's code and docs (unused files, exports, tokens, icons, packages, stale TODOs, docs and records that no longer match), report them to the owner with proof, and fix only what the owner approves, in small reviewable PRs. Use when the owner types /tidy or asks for a cleanup.
---

# /tidy

Leftovers are things nothing uses any more, or records that no longer say what is true. This skill finds them, proves each one, asks the owner, and removes only what the owner picks. It never refactors, restyles or changes behaviour: a tidy PR leaves every screen exactly as it was.

Scope: **code leftovers** and **docs and records**. Out of scope: GitHub branches and PRs, Claude sessions, scheduled tasks, the live database (read only, below), and anything under `supabase/migrations/` (applied migrations are history: never edited or deleted).

## 1. Scan (read-only, on the latest `origin/staging`)

Before scanning, list the files every open PR touches (GitHub, `ParaOrg/Para`, base `staging`). Those files are busy: skip them, and say so in the report.

Read `.claude/skills/tidy/keep.md` if it exists: things the owner already chose to keep. Never report them again unless the reason written there no longer holds.

**Code leftovers**

1. Unused files, components, hooks, functions and exports: nothing imports them.
2. Unused design tokens (`src/design-system/foundation/tokens.css`, `map-colours.ts`) and unused icons and images.
3. `TODO` comments whose reason is gone, e.g. "until the database types are regenerated" after they were.
4. Commented-out code and `console.log`.
5. Packages in `package.json` that nothing imports: not `src/`, `scripts/`, `tests/`, `workers/`, config files, nor CI workflows.
6. Stories and tests for things that no longer exist.

**Docs and records**

1. `supabase/migrations/README.md` ledger against what is live: `list_migrations` (Supabase tools, read-only).
2. `.scratch/` tickets whose work is merged but whose `Status:` still says open.
3. Docs (`docs/`, `CONTEXT.md`, READMEs, `.claude/`) that name files, paths, screens or scripts that no longer exist.

**Proof, for every finding.** "Nothing uses it" needs the search that shows it, and a search wide enough to be believed. Things are used in ways a plain import search misses; check these before calling anything unused:

- dynamic `import()` and `lazy()` paths, and files loaded by name (service worker precache lists, `vite*.config.ts`, `scripts/`, `workers/`, `android/`, `.github/workflows/`);
- Tailwind classes built from token names (`bg-${…}`), CSS custom properties read with `var(--…)` or from TypeScript;
- MapLibre layer, source and image ids used as strings;
- Storybook (`*.stories.tsx`), the unit checks (`tests/unit/`), the headless suites (`tests/e2e/`), and `scripts/checks/`.

When unsure, it is not a leftover: report it as **check first**, never as safe.

## 2. Report to the owner (plain words, nothing changed yet)

Most useful first, at most 30 findings; say how many more there were. Number them, grouped by kind. Each one:

- **What** — the leftover, in a few words.
- **Where** — the file (and line).
- **Why it's a leftover** — the proof, short.
- **Risk** — **safe** (proved unused, removing it changes nothing anyone sees) or **check first**.
- **Recommendation** — remove, keep, or ask.

End with the busy files skipped, and one line: "Reply with the numbers to fix, `all safe`, or `none`."

## 3. The owner chooses

Nothing is removed without the owner's answer. What the owner chooses to keep goes into `.claude/skills/tidy/keep.md` (what, where, why kept, date) in the same PR as the fixes, so the next `/tidy` does not ask again.

## 4. Fix only what was picked

- One small PR per kind (code removals apart from docs), each into `staging` from the latest `origin/staging`, never a draft. A PR that would touch more than about 20 files is split.
- Behaviour must not change. Before each push: `npm run check` (format, lint, the architecture doc, the build with its guards, the unit checks), `npm run build-storybook`, and the headless suites that reach the files touched (`tests/e2e/README.md`).
- The PR body lists each removal with its proof, and the size change the build reports (the page budgets in `scripts/checks/`).
- Follow `.claude/CLAUDE.md` and `docs/agents/how-we-work.md`: no new dependency, no unrelated changes, no mass refactor. The hub reviews and merges; the skill never merges.

## 5. Report back

In a few lines: the PR links, what was removed, what was kept and why, and anything that turned out to be used after all (and where), so the owner can trust the next report.
