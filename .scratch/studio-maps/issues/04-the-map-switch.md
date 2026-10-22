# 04: The switch: Contributors | Playground | Public

Status: resolved
Type: task
Wave: 3
Who: Sonnet
Blocked by: contribute/03

## What to build

`../spec.md`, "The switch".

- **Always on screen at the top: Contributors | Playground | Public,** a word and an icon each, the current one marked by more than colour. A real control: buttons with `aria-pressed`, or a radio group.
- **The address remembers it:** `?map=contributors|playground|public`, read with Zod; anything else is the default.
- **The default** is the one contribute/02 chose (recommended: Playground).
- **Switching keeps** the camera, the basemap and a half-drawn line.
- Until their tickets land, Contributors and Public say plainly what will be there. No made-up data.

## Files it owns

`src/features/studio/maps/` (the switch, its story, the hook that reads the address), and `src/app/studio/workshop.tsx`, the studio's main screen. One session at a time owns the main screen; this ticket hands it to 05 when merged.

## Acceptance checks

- A story for each choice, with focus; a `ds-reviewer` PASS.
- Keyboard: Tab reaches the switch, the arrows or Enter change the map.
- The studio's headless suite: switching keeps the camera and a half-drawn line.
- `npm run check` passes.

## Comments
