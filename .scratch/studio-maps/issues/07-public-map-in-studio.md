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
