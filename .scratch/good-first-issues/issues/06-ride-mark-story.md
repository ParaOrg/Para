# 06: A story for `RideMark`

Status: resolved (#527)
Type: task
Size: small
Blocked by: none

## What is missing

`src/features/routes/cards/ride-mark.tsx` draws the circled S (start) and circled E (end) beside a timeline row. It has no story.

## What to do

Add `src/features/routes/cards/ride-mark.stories.tsx`. Title: `Features/Routes/RideMark`. Show:

- **Start** and **End**, normal size
- **Start small** and **End small** (`isSmall`), which is how a hintuan's row draws them

The marks are white on a coloured disc, so put them on a card-coloured background. `livery-card.ts` in the same folder holds the card colours (see how `timeline-stick.stories.tsx` uses `TIMELINE_SURFACE`).

Do not change the component.

## Done looks like

- four stories (or one story with four marks) in `npm run storybook`
- `npm run check` passes

## Where to look

`src/features/routes/cards/ride-mark.tsx`, `timeline-stick.stories.tsx`.
