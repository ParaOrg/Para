# 07: A story for `TimelineDisclosure`

Status: resolved (#528)
Type: task
Size: small
Blocked by: none

## What is missing

`src/features/routes/cards/timeline-disclosure.tsx` is the row that folds a timeline's hintuans ("3 more hintuans") and opens them again. It has no story of its own.

## What to do

Add `src/features/routes/cards/timeline-disclosure.stories.tsx`. Title: `Features/Routes/TimelineDisclosure`. Stories:

- **Closed, jeep** (`isOpen` false, `isTrain` false): reads "N more hintuans"
- **Open**
- **Closed, train** (`isTrain` true): reads "N more stations"
- **Next to the ride:** a `connection` that leaves the rail unfilled

Look at the props in the file: `part` is `'all' | 'before' | 'after'`, `rail` and `pressed` are class strings, `connection` is a `TimelineStickConnection`. Get sensible values for `rail` and `pressed` from `livery-card.ts` and `timeline-row-role.ts`, or from how `timeline-route-detail.tsx` calls it. Make `onToggle` a `fn()` from `storybook/test`.

Do not change the component.

## Done looks like

- the stories show in `npm run storybook`, and clicking the row calls `onToggle`
- `npm run check` passes

## Where to look

`src/features/routes/cards/timeline-disclosure.tsx`, `timeline-route-detail.tsx`, `timeline-stick.stories.tsx`.
