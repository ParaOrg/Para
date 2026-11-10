# 04: Commuter map

Status: needs-info
Type: task
Blocked by: 02

Needs the owner's Figma for the faint look and the card wording (open questions 2 and 3), the size decision (open question 5), and the owner's Yes.

## What to build

- Draw attached stretches fainter than the main line, using the token the owner picks.
- Tapping a terminal on an attached stretch shows the route as "A – Z (also from A2)" (wording per open question 2). The route name stays the main start's.
- The ride's fare uses the stretch's own fare information.
- When the commuter is near an attached terminal, directions suggest boarding there.
- Anything shown only on the map is also text for screen-reader users.

## Files it owns

- `src/features/routes/map/` (the faint layer, taps)
- `src/features/routes/cards/` (the card wording, the fare)
- `src/features/locator/` only if the boarding suggestion needs it, through its `index.ts`
- Stories for the new card states

## Acceptance checks

- `npm run check` passes, with the public page's size inside the budget or the owner's OK quoted.
- The public page still loads no studio or contribute code (`check-build.mjs`).
- A route with no stretches looks and behaves exactly as before.
- Colour is not the only signal: the "also from" text is there.
