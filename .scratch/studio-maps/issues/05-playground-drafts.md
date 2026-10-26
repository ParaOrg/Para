# 05: The Playground saves drafts

Status: ready-for-human (owner: approve the "being changed by" wording in the PR, and decide the 7-day rule; then try two editors on the live studio)
Type: task
Wave: 3
Who: Sonnet
Blocked by: 01, 04

01 must be applied.

## What to build

`../spec.md`, "Draft → Pending → Approved" and "Playground"; `../../contribute/database.md` §8.

- **Save writes the editor's draft,** never the approved row: a route with both its directions, or a hotspot, as one payload, checked with Zod (`src/features/studio/data/draft-schema.ts`) on the way in and out. A new route or hotspot gets its id now, kept when approved.
- **The Playground shows** approved rows with the drafts laid over them, each marked Draft, Pending or Taken down (a word, not colour alone).
- **"Being changed by X"** on another editor's draft, from `editor_name`: it can be looked at, not changed.
- **Discard:** your own draft, after asking once. Another editor's after 7 days without a change, if contribute/02 approved it.
- A draft's passes (its hintuans) are worked out in the browser for display only. Nothing is linked until approval (06).

## Files it owns

`src/features/studio/data/drafts.ts` and `draft-schema.ts`, `src/features/studio/review/` (the marks and the notice), and the save flow in `src/features/studio/panels/` that now ends in a draft. The studio's main screen, from 04.

## Acceptance checks

- Two editors in two browsers: the second sees "being changed by X" and can't save over the first.
- After any number of saves, the publish run by hand writes byte-identical files.
- Unit checks: a payload round-trips through the schema; an old payload version still reads.
- The studio's headless suite; `npm run check`.

## Comments

2026-10-26, status check on `staging`: partly done. Exists (649e8434, 55afe525): saving writes a draft, never the approved row (`src/features/studio/data/draft-save.ts`, `drafts.ts` `claimDraft`/`updateDraft`, `draft-facts.ts`, `draft-new-place.ts`; on in production via `VITE_STUDIO_DRAFTS=1`), the Zod payload (`review-schema.ts`), drafts drawn over the approved map (`src/features/studio/maps/draft-lines.tsx`, `draft-markers.tsx`), revision checks against lost updates, discard with a confirmation (`review-confirmation.tsx`), tests `draft-save-test.mjs`, `draft-lines-test.mjs`, `draft-review-test.mjs`. Needs 0018, 0022, `20261018112757_reviewed_draft_approval` (all applied). Still missing: "Being changed by X" with the editor's name (nothing in `src/` reads `editor_name`; `claim_draft` only says the draft is someone else's), the other-editor-discard-after-7-days rule (`discard_draft` lets any editor discard any draft at once), the two-editor headless proof, and the Draft / Pending / Taken down marks on the Playground lists need checking against the ticket.

2026-10-26, "being changed by" and the two-editor proof (branch `claude/studio-maps-05`): built. Another editor's draft of a route or hotspot now shows on its card as "Being changed by NAME. You can look at it, but not change it." in place of Edit, Extend, Delete and the signboards; NAME comes from `editor_name` (`data/editor-names.ts`, key `editorKeys.names()`), and an editor with no row is "another editor", never an id or email. While it is being read the card says so, and if it cannot be read it says so with Try again (editing stays off meanwhile). A save built on another editor's draft is also refused in the data layer (`data/draft-guard.ts`), for a card opened before the other editor started. The Drafts list shows the real mark, Draft or Pending (it said Draft for both), and under another editor's draft says who is changing it. No migration was needed: `editor_name` is already readable by editors (0018). The headless proof is `tests/e2e/studio-two-editors-test.mjs` (in CI's "The editor" group); unit checks are `draft-lock-test` and `draft-guard-test`. Marks checked against the spec: Draft and Pending (fixed above) and Taken down (the "Routes and places" list, `review-subjects.tsx`, shows Approved or Taken down in words) are in words, not colour alone.

Still open on 05:
- **The 7-day rule** is not built. It waits on the owner (spec, "Open for the owner": may another editor discard a draft left 7 days?). `discard_draft` is as it was: any editor can discard any draft at once, and the Drafts list offers Discard… on another editor's draft.
- The map's own markers say "Draft: NAME-OF-THING" for every draft; they do not yet say Pending or who is changing it. Small, but a design call: the owner draws it.
- The acceptance check "after any number of saves, the publish run by hand writes byte-identical files" and the live try with two real editors are the owner's.
