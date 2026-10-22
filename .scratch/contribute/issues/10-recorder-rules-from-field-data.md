# 10: The recorder's rules, from the field data

Status: resolved
Type: task
Wave: 4
Who: Sonnet
Blocked by: 01, 04

## What to build

In `src/features/routes/model/` (no React, no browser APIs; both the contributor page and the studio import them):

- **`ride-recording.ts`** (from 01): the numbers 04 settled for jumps, hintos and gaps, each a named constant with a comment saying where it came from.
- **`point-pack.ts`:** encode a recording's kept points into `point_batch` rows and decode them back, as `../database.md` §3 describes: up to 600 points a row, the first point absolute in millionths of a degree, then the changes; time in milliseconds; accuracy; the phone's speed or null. A format version.
- **The line and its box:** the kept points thinned with `overviewOf` (`src/shared/utils/geo.ts`), and west, south, east, north.
- **The caps** the database enforces (§5), as constants here too, so the phone refuses before it sends what the database would refuse. The migration's header and these constants cite each other.

**Test data:** made-up rides, and the owner's own rides from 04 that the owner agreed to, trimmed 300 m at each end, in `tests/unit/fixtures/rides/`. Nothing else from the field test enters the repo.

## Files it owns

`src/features/routes/model/ride-recording.ts`, `point-pack.ts`, `tests/unit/ride-recording-test.mjs`, `tests/unit/point-pack-test.mjs`, `tests/unit/fixtures/rides/`.

## Acceptance checks

- `npm run test:unit` and `npm run check` pass.
- Decoding an encoded ride gives every point back within 0.1 m and 1 ms.
- A ride that breaks a cap is refused by the same numbers the database uses.
- The public page's chunks are unchanged (nothing here is imported by it).

## Comments
