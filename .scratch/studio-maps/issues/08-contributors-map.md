# 08: The Contributors map

Status: ready-for-agent
Type: task
Wave: 5
Who: Sonnet
Blocked by: 04, contribute/08, contribute/13

contribute/08 must be applied, and there should be real contributions to look at.

## What to build

`../spec.md`, "Contributors".

- **The reader,** `src/features/studio/data/contributions-read.ts`: contributions in slices (a date range, 7 days by default, and the area in view by the line's box), never a whole table; their hintos. Parsed with Zod at the boundary, where `snake_case` becomes `camelCase` and the database's names become the glossary's.
- **Faint lines,** one per contribution; hidden ones only with "Show hidden".
- **Hintos as circles sized by their minutes,** each marked "inside hintuan X" or "no hotspot here", worked out from the approved boxes when drawn.
- **A list beside the map** of the contributions in view: date, minutes, distance, what was ridden, the start and end names, the description, the minutes lost to gaps, the phone's short code. Everything on the map is also here as text.

## Files it owns

`src/features/studio/contributors/`, `src/features/studio/data/contributions-read.ts`.

## Acceptance checks

- With 1,000 made-up contributions from a fake reader (no writes to the live database), panning and filtering stay smooth in `studio-scale-test`.
- The list and the map show the same contributions.
- Stories for a list row (long names, no names, hidden) and the hinto legend.
- `npm run check` passes.

## Comments
