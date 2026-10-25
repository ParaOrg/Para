# 05: Public map: empty card, no button

Status: resolved
Type: task
Who: a session
Blocked by: —

- `src/app/public-map/contribution-card.tsx`: keep the card's surface, size and place at the end of the route list (it still fills the sheet below a short list); remove its text and link. It's decorative now: `aria-hidden`, not focusable.
- `src/app/public-map/contributor-button.tsx`: not rendered.
- Update the e2e that looked for `contribution-link` / `contributor-button`, and the card's story.
- `npm run check`; the public page's bundle doesn't grow.

## Answer

Done in #382. `ContributionCard` keeps its surface, glow, blob, place and growth (at least its old height, `min-h-31`) with no text or link, `aria-hidden`. `ContributorButton`, `PlusIcon` and `ArrowRightIcon` are deleted; the list's `end` slot stays. The story asserts no link and `aria-hidden`; `phone-test.mjs` asserts the button is absent.
