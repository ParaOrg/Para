# 06: Submit, Approve, Send back, Take down, Put back

Status: resolved
Type: task
Wave: 3
Who: Sonnet
Blocked by: 05

## What to build

`../spec.md`, "Draft → Pending → Approved" and the Playground's review list.

- **Submit:** Draft to Pending, after the studio's existing save checks.
- **The review list:** everything pending, who drew it, the approved version beside the new one (the line drawn over the approved line; changed fields listed).
- **Approve:** writes the draft into the live tables through the existing save code (`routes-write.ts`, `hotspots-write.ts`), which re-links the hintuans against approved lines and boxes, then deletes the draft, last. Refused when the approved row changed since the draft began (`base_updated_at`). A route offers its pending hotspots first; one with an unapproved end is refused with a plain message.
- **Send back:** Pending to Draft, with a note the editor sees.
- **Take down** and **Put back:** the status, and a `takedown` row for the publish's guard. A hotspot that ends an approved route says why it can't be taken down.

## Files it owns

`src/features/studio/review/`, `src/features/studio/data/approve.ts` and `takedown.ts`, and the calls into the existing save code.

## Acceptance checks

- A new route approved appears in the next publish run by hand; taken down, it is gone and the guard passes; put back, it returns.
- An approve that fails halfway (a forced failure in a test) leaves the draft, and a second try finishes it.
- Send back shows its note to the draft's editor.
- The studio's headless suite; `npm run check`.

## Comments
