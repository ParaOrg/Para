# 03 — Clear the lint warnings, one rule at a time

Status: ready-for-agent
Type: task

## What

`npm run lint` gave 0 errors and 85 warnings across 45 files on
2026-10-13. `CLAUDE.md`: every rule warns until the tree is clean of it,
then errors. Count by rule that day:

| Rule | Warnings |
|---|---|
| react-hooks/refs | 28 |
| @typescript-eslint/no-non-null-assertion | 21 |
| react-hooks/set-state-in-effect | 12 |
| react-hooks/immutability | 8 |
| react-hooks/exhaustive-deps | 5 |
| jsx-a11y/no-autofocus | 4 |
| preserve-caught-error | 2 |
| react-hooks/purity | 1 |
| @typescript-eslint/no-dynamic-delete | 1 |
| react-hooks/preserve-manual-memoization | 1 |
| no-control-regex | 1 |
| no-irregular-whitespace | 1 |

## How

- One rule per PR. Start with the small ones (the last six rows), then
  `exhaustive-deps`, `no-autofocus`, `no-non-null-assertion`, and the
  React Compiler rules last: those touch hook behaviour.
- Fix the code; don't disable the rule. A one-line disable needs a
  comment saying why (`CLAUDE.md`), and only where the rule is wrong for
  that line.
- When a rule reaches 0, switch it to `error` in `eslint.config.js` in
  the same PR.
- A fix that would change behaviour (an effect's timing, a ref read in
  render) is not a refactor: stop, and note it under `## Comments`.

## Done when

- The rule shows 0 warnings and is `error` in `eslint.config.js`.
- `npm run check` passes; for a react-hooks rule, the headless suites the
  touched files reach pass as before.
- A `ds-reviewer` PASS for anything under `src/`.

## Comments
