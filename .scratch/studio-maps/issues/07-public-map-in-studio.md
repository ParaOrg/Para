# 07: The Public map in the studio

Status: resolved
Type: task
Wave: 3
Who: Sonnet
Blocked by: 03, 04, 06

## What to build

`../spec.md`, "Public".

- **The published map,** read with the reader 03 moved, exactly as commuters read it. Read-only.
- **Take down** and **Put back** on a route or hotspot (06's actions).
- **"Waiting for tonight's publish":** what was approved, taken down or put back since the index's `published_at`, as a list.

## Files it owns

`src/features/studio/public-view/`.

## Acceptance checks

- For the same index, the studio's Public map shows the same directions and hotspots as the public page (a headless check comparing their ids).
- The waiting list empties after a publish.
- `npm run check` passes.

## Comments

2026-10-26, status check on `staging`. Done (commit 07cfc5fd and the lane-b merge 15ad17e5). Evidence: `src/features/studio/public-view/` (`studio-public-view.tsx`, `waiting-list.tsx`, `public-waiting.tsx`, stories) and `tests/e2e/studio-public-view-test.mjs`, which compares the ids the studio's Public map draws with the public page's, and runs in CI. Take down / Put back come from 06's actions. Needs 0018 and 0022 (both applied live).
