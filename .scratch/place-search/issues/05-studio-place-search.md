# 05: Studio place search

Status: resolved
Type: task
Blocked by: 03

The owner said yes on 2026-11-06 (via the hub, its items 43 to 48).

## What to build

Place search in the studio, reusing the commuter's: `src/features/routes/model/place-search.ts` and `src/features/routes/search/`, never a fork. The studio may import routes; the import walls stay (`scripts/checks/check-build.mjs` still proves no studio code reaches the public or contributor page), and the public page's budget does not move.

- **What it searches** (43): the studio's own hotspots as the database holds them, through `src/features/studio/data/`, drafts and unpublished ones included, and the OpenStreetMap landmarks through step 2's reader (`routes/published/`).
- **Where** (44, 47): one bar, the same place on all three studio maps: the workshop, the Public map view and the Contributors map. At the top of the map, computer size only; the studio has no phone layout. From existing primitives and tokens, its look on the "Owner to design later" list.
- **Picking a result** (45): a Para hotspot moves the camera there and opens its hotspot card. A landmark moves the camera and shows a small temporary marker. Neither ever changes the drawing or a draft.
- **While drawing** (46): search still jumps the camera, nothing else. No "make a hotspot here" button.

## Files it owns

- The studio's search wiring: a hook in `src/features/studio/` mapping database rows to searchable places, and the bar's placement in each studio map.
- Stay out of the route-line layer files in `src/features/routes/map/` and the studio map files the APK session is passing through; coordinate with the hub before touching a shared map file.

## Acceptance checks

- Unit checks for the database row → searchable place mapping (drafts and unpublished included, the glossary's names), and for a landmark pick never touching the draft.
- Stories for the studio bar's states.
- A ds-reviewer PASS; the studio suites it reaches; `npm run check`; CI green; merged into staging.
