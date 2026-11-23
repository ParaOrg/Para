# 03: Landmarks and routes near here

Status: resolved
Type: task
Blocked by: 01, 02

## What to build

Step 2 of `../README.md`, decisions 7 to 10.

- **Reader**: `src/features/routes/published/fetch-landmarks.ts` with a Zod schema for `landmarks.v1.json` (translating `extract_at` and the rest at the boundary). Fetched on the first search only, by a dynamic `import()` so neither the reader nor the file is in the public page's shared chunk.
- **Offline**: the offline worker keeps `/data/landmarks.v1.json` once fetched (`scripts/node/offline-worker-caches.ts`, a runtime rule beside the line files'). Not precached.
- **Results**: Para places first with their mode icon, then landmarks marked as landmarks; the same match and ranking as 02 over the landmark's name and aliases. "© OpenStreetMap contributors" beside the results whenever a landmark is listed.
- **Routes near here**: a landmark that is not a Para place lists the hintuans within about 500 m straight-line, nearest first, each with its routes, and says the distance is straight-line. None: "No Para routes near here yet". Pure function in `model/` with unit checks.
- A landmark whose name matches a Para place and lies within about 250 m of it is the place, not a second row.

## Acceptance checks

- Unit checks for routes near here and for merging a landmark into its place.
- Stories for: loading the landmark file, error (file unavailable offline), landmark results, routes near here, no routes near here, long names.
- `scripts/checks/check-build.mjs` still passes; shared code unchanged within budget (health.mjs before and after).
- A ds-reviewer PASS. `npm run check` and the public suites pass.
