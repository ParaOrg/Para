# 05: The Playground saves drafts

Status: resolved (merged; the owner applies the Keep migration below, then approves the "being changed by" wording)
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

2026-10-26, review fixes on PR #407: the Drafts screen no longer edits another editor's draft (details form replaced by the notice; `saveDraftFacts`, `refreshDraftBase` and a hotspot take-down are guarded). Written, not applied: `supabase/migrations/20261026090000_draft_update_own.sql` narrows `draft_update` to the draft's maker (or a draft whose maker is gone), so the database says it too; the review functions are security definers and are unaffected. The owner applies it from `supabase/apply/20261026090000_draft_update_own_apply.sql`.

2026-11-28, the 7-day rule (owner's decision: another editor may discard a draft only once it has gone 7 days without a change; an editor's own draft any time, after the confirmation). Corrects the note above: by then `discard_draft` already answered `not_your_draft` to another editor (20261105120000_review_rules) and the studio offered Discard to the maker only, so the rule loosens that. Built: the migration `supabase/migrations/20261128090000_discard_stale_draft.sql` makes `discard_draft` refuse another editor's draft younger than 7 days (`draft_too_recent`, with `discardable_from`), counted from `draft.updated_at`; same signature, grants and security settings. Studio: on another editor's draft the lock notice shows "You can discard this from 5 Dec if it isn't changed." until then, and Discard… (with its confirmation) from day 7; the database's refusal, if the card is stale, is shown in words. The 7 days are `OTHER_EDITOR_DISCARD_DAYS` (`src/features/studio/data/draft-discard.ts`) and the migration's interval, which must match. Unit checks `draft-discard-test`; `studio-two-editors-test` covers a fresh draft (no Discard, the line), an old one (Discard…, asks first), and a stale card (refused). **The migration is written, not applied: the owner applies it** (`supabase/apply/20261128090000_discard_stale_draft_*.sql`, steps in `supabase/apply/README.md`). Until then the live database still refuses another editor's discard in every case, and the studio says so in words. Once applied, the `not_your_draft` expectation for a non-maker discard in `supabase/apply/20261105120000_review_rules_check.sql` and `supabase/verify/README.md` is superseded by this migration (a non-maker gets `draft_too_recent` before day 7, and discards after it).

2026-11-28, the owner (through the hub): (a) skip the live two-editor try, because the automatic `tests/e2e/studio-two-editors-test.mjs` covers it; (b) the 7-day rule: yes, another editor may discard a draft left untouched for 7 days. A separate session builds the rule and closes this ticket, so the status stays as it is.

2026-11-28, resolved: the 7-day rule merged (#1304). `20261128090000_discard_stale_draft` (the rule in the database) is applied (the owner, 2026-11-28, ledger `20261128150102`). **Awaiting the owner's apply:** its follow-up `20261128120000_refresh_draft_base_maker`, which gives `refresh_draft_base` (Keep my draft) the maker test `save_draft` has, so another editor can neither rewrite a draft nor reset its 7 days; a refusal shows in words (`not_your_draft`). Steps: `supabase/apply/README.md`.
