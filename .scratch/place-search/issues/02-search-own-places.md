# 02: Search Para's own places

Status: resolved
Type: task
Blocked by: the route card redesign's step 7 (`claude/route-card-commuter-wiring`) merging into `staging`

Merge `staging` in first. The redesign owns `src/features/routes/cards/`, `src/app/public-map/`, the route-line layers in `src/features/routes/map/` and `src/shared/ui/bottom-sheet*` until it lands; after it lands, edits there stay small and opt-in.

## What to build

Step 1 of `../README.md`, decisions 1 to 5.

- **Model** (`src/features/routes/model/place-search.ts` or similar, no React): places from the index's hotspots (grouped by informal name, as `CONTEXT.md` defines a place); a fold (lower case, accents removed, spaces collapsed); a match of a query against a place's informal name, names and aliases, with a quality (whole, word start, inside, small typo: edit distance 1 for 4–7 letters, 2 for 8+); a ranking by quality, then straight-line distance from the commuter when location is on, then name.
- **UI**: a search field and a results list from existing primitives and tokens; the empty state "No place called '…' yet". On a phone, at the top of the map; on a computer, at the top of the docked route list.
- **Choosing a result** calls the same handler a tap on the place on the map calls: the camera moves there and its route list opens.

## Acceptance checks

- Unit checks for the fold, the match and the ranking (`tests/unit/place-search-test.mjs`).
- Stories for: default, typing, results, no match, long names (loading and error arrive with 03).
- Keyboard: the field has a label, results are reachable with arrow keys or Tab, Enter chooses, Escape clears; focus is always visible.
- A ds-reviewer PASS. `npm run check` and the public suites pass.
- Shared code stays under the 413 kB budget: measure with `npm run build`, then `node --experimental-strip-types scripts/checks/health.mjs`. If the search would push it over, lazy-load the search UI.
