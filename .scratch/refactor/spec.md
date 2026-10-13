# Refactor: keep the codebase easy to change

Status: ready-for-agent

Written 2026-10-13, after the train-line colours (#135 and its follow-up)
showed where the code has grown heavy. The owner's call, the same day:
refactor regularly, in small steps, and run them while he sleeps, not
while we work together.

## Why

- Adding one card colour touches about 15 files. Pink (2026-10-12) and the
  three train lines (2026-10-13) each meant editing every map in
  `livery-card.ts` (9) and `livery-line.ts` (5), then stories, unit tests
  and the headless suites.
- Doc comments have become a dated history of every past decision, which
  makes files slow to read and lets a comment go stale. The reviewer
  caught one on 2026-10-13.
- 85 lint warnings across 45 files keep 12 rules at "warn". `CLAUDE.md`
  says a rule moves to error only once the tree is clean of it.
- `tests/e2e/phone-test.mjs` is 4,044 lines and a run takes over half an
  hour. Four jeepney-only assumptions in the suites needed two rounds to
  find on 2026-10-13.

## Rules for every refactor here

These come from `CLAUDE.md`, restated for an agent working alone:

- One issue, one branch, one PR into `staging`. Never bundle a behaviour
  change with a refactor. If one is needed, stop and write it up under
  `## Comments` instead.
- Behaviour stays the same. Before opening the PR, show that
  `npm run check` passes, and that the headless suites the change reaches
  pass as before (at most two at once, never against port 5173).
- Get a `ds-reviewer` PASS on anything under `src/`.
- Don't mass-edit files the issue doesn't name.
- If an issue turns out bigger than it says, do the first slice that
  stands alone, open the PR, and note what's left under `## Comments`.

## Issues

| # | Issue | Size |
|---|---|---|
| 01 | [One look per card colour](issues/01-one-look-per-livery.md) | M |
| 02 | [Comments say why now; history goes to ADRs](issues/02-comments-why-not-history.md) | M, in slices |
| 03 | [Clear the lint warnings, one rule at a time](issues/03-lint-warnings-to-errors.md) | S per rule |
| 04 | [Split the biggest headless suites](issues/04-split-headless-suites.md) | L, in slices |

They are independent; 01 first saves the most work on the next colour.
