# 16: Delete the deprecated semantics

Status: blocked
Type: task
Blocked by: every screen on the new semantics

## What to build

- **One clean-up pull request** that deletes Figma's "Semantics(Depreciated)" tokens from `tokens.css`, with their `@theme inline` lines and their story (README, decision 10).
- **Only once nothing uses them:** a search of `src/` finds none of their utilities.
- **The owner's OK** comes first, through the hub.
- **The card shadow folds back.** `--shadow-route-card-fill` (the restyled RouteCard's) holds Figma's Route/RouteCardPrimary as it now stands. Once the five other users of `--shadow-route-card-primary` are restyled, that token takes the new values and the card's folds into it.

## Done when

- `npm run build` and the Storybook build pass with the old tokens gone.
- The stories show no unpainted swatch.
