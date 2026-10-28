# 04: A story for `TripTiles`

Status: ready-for-human
Type: task
Size: small
Blocked by: none

## What is missing

`src/features/routes/cards/trip-tiles.tsx` draws the Distance and Fare tiles under a trip card. It has several visible states and no story. The standards ask for a story when a feature component has meaningful visual states.

## What to do

Add `src/features/routes/cards/trip-tiles.stories.tsx` next to it. Copy the layout of `timeline-stick.stories.tsx` in the same folder. Title: `Features/Routes/TripTiles`. Stories for:

- **Regular fare:** `shown` is `{ regular: '₱13', discounted: '₱10' }`, `isDiscounted` false.
- **Discounted fare:** the same with `isDiscounted` true.
- **Free:** `shown` is `FREE` (exported from `trip-fare.ts`), as for the ferry.
- **No fare yet:** `shown` is `undefined`: only the Distance tile shows.
- **Long distance:** `shownMetres` large, such as `128400`.

Give `onTurn` a `fn()` from `storybook/test`. Put the story on a phone-wide white box (the other stories in the folder show how).

Do not change the component or its look.

## Done looks like

- `npm run storybook` shows the five stories and the Fare tile's click works
- `npm run check` passes

## Where to look

`src/features/routes/cards/trip-tiles.tsx`, `trip-fare.ts`, and any `*.stories.tsx` in that folder.
