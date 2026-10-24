# 05: Public map: empty card, no button

Status: claimed
Type: task
Who: a session
Blocked by: —

- `src/app/public-map/contribution-card.tsx`: keep the card's surface, size and place at the end of the route list (it still fills the sheet below a short list); remove its text and link. It's decorative now: `aria-hidden`, not focusable.
- `src/app/public-map/contributor-button.tsx`: not rendered.
- Update the e2e that looked for `contribution-link` / `contributor-button`, and the card's story.
- `npm run check`; the public page's bundle doesn't grow.
