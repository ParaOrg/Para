# 09: Use this line, Draw a hintuan here, Hide, Block

Status: resolved
Type: task
Wave: 5
Who: Sonnet
Blocked by: 05, 08

## What to build

`../spec.md`, "Contributors".

- **Use this line:** the contribution's line, snapped to the roads now (through the studio's existing router, `drawing/snap.ts`), becomes a draft direction in the Playground. The editor picks the route and direction, or a new route by its two ends, with the contributor's start and end names shown as hints. Records `contribution_use` (`direction`, the direction's id).
- **Draw a hintuan here:** from a hinto or a cluster, switches to the Playground with the box started. When the draft is saved, records `contribution_use` (`hintuan`) for each contribution with a hinto inside the box.
- **Hide** and **Unhide** a contribution, with a note.
- **Block** and **Unblock** a phone, with a note. The list says how many contributions came from it.

## Files it owns

`src/features/studio/contributors/actions/`, `src/features/studio/data/contributions-write.ts`.

## Acceptance checks

- Each action works in the studio's headless suite against a fake reader and writer.
- Once live: the owner uses a line and draws a hintuan once each, and the `contribution_use` rows are there.
- `npm run check` passes.

## Comments
