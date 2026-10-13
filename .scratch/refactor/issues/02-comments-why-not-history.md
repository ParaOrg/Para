# 02 — Comments say why now; history goes to ADRs

Status: ready-for-agent
Type: task

## What

Many doc comments under `src/features/routes/` and
`src/design-system/foundation/` record every past state of a decision
("blue/200 until 2026-09-30", "yellow left on 2026-10-12", "16 before").
`CLAUDE.md` asks comments to say *why*, not *what*, and Git keeps the
history.

For each file in a slice:

- Keep in the comment what a reader needs today: the reason, the owner's
  decision that set it, with its date and Figma node.
- Move a superseded state out of the comment. If it is a decision someone
  might revisit (a colour dropped, a rule changed), record it in an ADR
  under `docs/adr/`, in the existing ADRs' format; otherwise drop it,
  since `git log` has it.
- Don't change any code. Don't reword a comment that is already short and
  current.

## Slices

Do one slice per PR, in this order:

1. `src/features/routes/cards/` (livery-card.ts, trip-timeline.tsx,
   route-card.tsx, trip-card.tsx, use-card-stack.ts first).
2. `src/features/routes/map/`.
3. `src/design-system/foundation/tokens.css` and `map-colours.ts`.

## Done when

- The slice's diff touches comments and `docs/adr/` only (check with
  `git diff --stat` and a read of the diff).
- `npm run check` passes.
- A `ds-reviewer` PASS, asked in particular whether any comment lost a
  *why* a reader still needs.

## Comments
