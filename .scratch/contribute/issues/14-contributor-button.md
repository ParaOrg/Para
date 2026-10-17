# 14: The Contributor button on the public map

Status: needs-info
Type: task
Wave: 4, at the end of the test period
Who: Sonnet, or Opus with the owner if the button is a new component
Blocked by: 12, 13, 15
Waiting on: the owner's go to end the test period (answer 2b), the check with the National Privacy Commission, and the button's Figma

## What to build

A Contributor button at the public map's top left: a plain link, `<a href="/contribute/">`. The public map imports nothing from `features/contribute`, so a commuter who never taps it downloads nothing extra.

- From the owner's Figma, placed with what already sits at the top (the status bar, the layers button).
- An accessible name; a 44 px target; focus visible. A story.

## Files it owns

`src/app/public-map/` (the wiring), and the button's component where the design system or `shared/ui` says it belongs.

## Acceptance checks

- `check-build.mjs`: the public page holds no contribute module and no Supabase client; its weight grows by the link alone.
- `commuter-test` and `phone-test` pass; `npm run check` passes.

## Comments
