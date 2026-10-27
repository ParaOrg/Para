# 05: A story for `TripSignboards`

Status: ready-for-human
Type: task
Size: small
Blocked by: none

## What is missing

`src/features/routes/cards/trip-signboards.tsx` shows the strip of signboard pictures between a trip card and its tiles. It has no story. A signboard is the short sign a jeep carries, such as `TALA – SM FAIRVIEW` (see `CONTEXT.md`).

## What to do

Add `src/features/routes/cards/trip-signboards.stories.tsx`. Title: `Features/Routes/TripSignboards`. Stories for:

- **One signboard** (the picture's alt text reads "Signboard").
- **Several signboards** (alt text reads "Signboard 1 of 3" and so on).
- **Many signboards** that wrap on a narrow box.

The component takes a list of image addresses. Use small inline SVG data URIs (`data:image/svg+xml,...`) as stand-ins, so the story needs no new files. Do not make the pictures look like real signboards; plain labelled rectangles are enough.

Do not change the component.

## Done looks like

- the three stories show in `npm run storybook`
- `npm run check` passes

## Where to look

`src/features/routes/cards/trip-signboards.tsx`, and any `*.stories.tsx` in that folder.
