# 02: The publish: approved only, takedowns against the guard, no contributor data

Status: ready-for-agent
Type: task
Wave: 2
Who: Sonnet
Blocked by: 01

Can be written against 01's design; tested once 01 is applied.

## What to build

`../spec.md`, "The publish".

- **Approved only** comes from 01's read rules; the queries in `scripts/publish/publish-map.mjs` don't change. Say so in a comment where the tables are read.
- **Takedowns against the 30% guard:** read `takedown` since the previous file's `published_at`; rows that disappeared and were taken down on purpose don't count toward the shrink. A table emptied without takedowns still fails. Force stays.
- **No contributor data, proved on every run:**
  - for each of `contributor`, `contribution`, `point_batch`, `hinto`, `contribution_use`, `draft` and `editor_name`, one request with the publishable key, `limit=1`. Any row back fails the run. A refusal or a missing table passes;
  - `scripts/checks/check-map-data.mjs`: no published file holds a field only contributor data has (`contribution_id`, `contributor_id`, `hinto`).
- **Unit checks** for the guard's arithmetic in `tests/unit/`.

## Files it owns

`scripts/publish/`, `scripts/checks/check-map-data.mjs`, `tests/unit/` (the guard's checks), `.github/workflows/publish-map.yml` only if its comments need it.

## Acceptance checks

- `npm run check` passes.
- The guard: four of ten routes taken down passes; a table read back empty with no takedowns fails.
- The probe passes against the live project before and after contribute/08.
- A run by hand writes byte-identical files.

## Comments
