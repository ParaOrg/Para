# 16: Delete the deprecated semantics

Status: blocked
Type: task
Blocked by: every screen on the new semantics

## What to build

- **One clean-up pull request** that deletes Figma's "Semantics(Depreciated)" tokens from `tokens.css`, with their `@theme inline` lines and their story (README, decision 10).
- **Only once nothing uses them:** a search of `src/` finds none of their utilities.
- **The owner's OK** comes first, through the hub.

## Done when

- `npm run build` and the Storybook build pass with the old tokens gone.
- The stories show no unpainted swatch.
