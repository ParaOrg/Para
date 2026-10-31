# 08: A story for `TripOtherRoutes`

Status: resolved (#529)
Type: task
Size: small
Blocked by: none

## What is missing

`src/features/routes/cards/trip-other-routes.tsx` shows "Other routes": a row for each other route that leaves from where the trip starts. It has no story.

## What to do

Add `src/features/routes/cards/trip-other-routes.stories.tsx`. Title: `Features/Routes/TripOtherRoutes`. Stories:

- **Default:** three rows, such as `{ id: 'a', to: 'SM Fairview' }`
- **One route**
- **Long name:** a destination long enough to need cutting (check whether the row truncates it; if it wraps instead, that is fine, just show it)

Use real-sounding Manila places (SM Fairview, Novaliches, Tala, Commonwealth). Make `onRoute` a `fn()` from `storybook/test` and check a click passes the row's `id`, with a `play` function like the one in `src/shared/ui/sheet-header.stories.tsx`.

Do not change the component.

## Done looks like

- the stories show in `npm run storybook`
- `npm run check` passes

## Where to look

`src/features/routes/cards/trip-other-routes.tsx`, `src/shared/ui/sheet-header.stories.tsx` for a `play` example.
