# 06: Submit, Approve, Send back, Take down, Put back

Status: ready-for-human (owner: approve one real draft, run or wait for the publish, and check it appears; then take it down and put it back)
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

2026-10-26, status check on `staging`. Code done in 649e8434 (a different tool built it), refined by e2bb3b5c and 55afe525. It differs from the ticket on purpose: Approve is one database function, not the `routes-write.ts` / `hotspots-write.ts` save code, so it succeeds or fails whole (no half-approved state) and refuses when the approved row changed meanwhile (`revision_mismatch` / `conflict`). Evidence: `src/features/studio/data/drafts.ts` (`submitDraft`, `approveDraft`, `takeDown`, `putBack`, `discardDraft`), `review-commands.ts`, `review-schema.ts`, `src/features/studio/review/` (queue, comparison, geometry, conflict, send-back note in `review-details.tsx`, `publication-panel.tsx`), `supabase/migrations/0022_draft_ops.sql` (`submit_draft`, `send_back_draft`, `approve_draft`, `take_down`, `put_back`; an end hotspot of an approved route is refused with `blocked`), `tests/unit/review-flow-test.mjs`, `draft-review-test.mjs`, `tests/e2e/review-test.mjs`, `review-publication-test.mjs`. Needs 0018, 0022 and `20261018112757_reviewed_draft_approval`, all applied live. Left: the by-hand publish run.
