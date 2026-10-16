# Visitor → Commuter

**The owner's call (2026-10-15):** the person on the public map is a **commuter**.

**Why now:** the glossary chose "visitor" and avoided "commuter" because a driver or a dispatcher may open the public map too. Drivers now get their own word and their own page (see `driver-app`), so whoever opens the public map is there as a commuter.

**Nothing changes on a phone.** "Visitor" appears in no on-screen text, stored setting, the published map, address or test id: only in docs, code names and comments (checked 2026-10-15).

Four phases, one pull request each, in this order.

## Phase 1: docs

- **`CONTEXT.md`:** the Visitor entry becomes **Commuter**: anyone who opens the public map, who asks nothing of anyone (no account, no permission, no tracking). _Avoid_: user, visitor. Other entries that say "visitor" follow.
- **ADR 0001:** a dated amendment saying "visitor" now reads "commuter". Its body and its file name stay, since links point to it.
- **`.claude/CLAUDE.md`** (except the `VisitorLocation` import example, which changes in phase 2), `.claude/agents/ds-reviewer.md`, `.claude/skills/ds-component/SKILL.md`, `README.md`.

## Phase 2: code names

- `git mv src/features/locator/visitor-location.tsx src/features/locator/commuter-location.tsx`
- `VisitorLocation` → `CommuterLocation` in `src/features/locator/index.ts`, `src/app/public-map/public-map-app.tsx` and the import example in `.claude/CLAUDE.md`.
- The `Visitor` helper in `tests/unit/commit-turn-test.mjs`.

**Done when:** typecheck, lint, unit tests and `npm run build` pass.

## Phase 3: the suite's name

- `git mv tests/e2e/visitor-test.mjs tests/e2e/commuter-test.mjs`, and `VISITOR_PART` → `COMMUTER_PART`.
- What points to it: `.github/workflows/ci.yml` (its path filter, three matrix jobs and the env variable), `tests/e2e/README.md`, `README.md`, and comments naming the suite (`direction-arrows.ts`, `map-view.tsx`, `warm-programs.ts`, `tests/unit/gl-programs-test.mjs`, `tests/e2e/phone-test.mjs`, `tests/e2e/lib/looks.mjs`, `tests/e2e/lib/geo.mjs`).
- ⚠️ **This renames three CI checks.** Before merging, check whether the branch settings require them by name. If they do, the owner swaps the names in the repo's settings as it merges, or the pull request waits forever for checks that no longer exist.

## Phase 4: comments

About 150 comments in `src/`, `tests/`, `scripts/` and `src/design-system/foundation/tokens.css`. Words only, no code.

**Done when:** `grep -ri visitor src tests scripts` finds nothing.

## Left as they are

`PLAN.md`, and the reviews, research, big-file-wave and figure write-ups in `docs/`: they are records of their time. ADR 0001's file name.
