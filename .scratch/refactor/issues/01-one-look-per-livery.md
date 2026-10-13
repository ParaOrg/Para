# 01 — One look per card colour

Status: ready-for-agent
Type: task

## What

A card colour (a `Livery`: the six jeepney ones and the three train
lines) is spread over one map per property:

- `src/features/routes/cards/livery-card.ts`: `CARD_SURFACE`,
  `CARD_SURFACE_PALE`, `CARD_TEXT`, `CARD_SHADOW`, `CARD_SHADOW_SELECTED`,
  `CARD_BLOB`, `TIMELINE_SURFACE`, `ROW_PRESSED`, `TIMELINE_PILL`.
- `src/features/routes/map/livery-line.ts`: `LIVERY_LINE`,
  `LINE_SURFACE`, `LINE_TEXT`, `LINE_FILL`, `LINE_WORDS`.

Fold each file's maps into one record keyed by livery, so a colour's
whole look is one entry:

```ts
export const CARD_LOOK = {
  red: {
    surface: 'bg-card-red-surface border-card-red-border-primary',
    pale: 'bg-card-red-surface-pale',
    text: 'text-content-inverse',
    // …
  },
  // …
} satisfies Record<Livery, CardLook>;
```

## Must hold

- Every class name stays a full literal. Tailwind can't see names built
  at runtime (`ds-component` skill, rule 3).
- `satisfies Record<Livery, …>` stays, so a missing colour is a type
  error.
- Nothing renders differently. The stories' play checks and the headless
  suites' colour checks are the proof.
- `LineColour` ('selected', the blue with no card) still has its rows
  where `LINE_*` has them today.

## Done when

- One record per file, the call sites updated, and the old map names gone.
- `npm run check`, `build-storybook`, the stories of `RouteCard`,
  `TripTimeline`, `RouteTripDetail`, `HintuanLabel`, `RouteLineLabel` and
  `RouteLineEndingsLabel` all pass; `phone-test` and `visitor-test` pass
  as before.
- A `ds-reviewer` PASS.

## Comments
