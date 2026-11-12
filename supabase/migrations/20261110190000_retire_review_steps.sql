-- ParaPo — retire the review steps the studio no longer has: approval only
-- through publish_draft, a draft's payload only through save_draft.
--
-- APPLY ONLY AFTER MAIN HAS THE NEW STUDIO, the one that saves with
-- save_draft, publishes with publish_draft and unpublishes with unpublish.
-- Staging and production share this database: the studio on an older main
-- updates drafts directly and approves with submit_draft and
-- approve_reviewed_draft, and both stop working the moment this is applied.
--
-- The second half of clean-up step 3 of .scratch/codebase-review/database.md:
-- - approve_draft, approve_reviewed_draft, submit_draft and send_back_draft
--   are dropped. Approval has one way in, publish_draft, always with the
--   revision check (H3). private.apply_draft stays: publish_draft applies
--   through it.
-- - Editors lose the direct update of a draft, and draft_update goes, so a
--   draft's status can no longer be set by hand (M2). save_draft is the way
--   to change a payload; the draft_saver trigger still names who saved it.
--
-- Unchanged: claim_draft, save_draft, publish_draft, unpublish,
-- discard_draft, refresh_draft_base, take_down and put_back. draft.status and
-- submitted_at stay, always 'draft' and null from here on, retired with the
-- rest of the review machinery later (M3).
--
-- Order: after 20261105160000_draft_published (its apply refuses without it).
-- Not applied by the session that wrote it: the owner applies it, as
-- postgres, from supabase/apply/20261110190000_retire_review_steps_apply.sql,
-- then records the ledger version. Safe to run twice. Undo:
-- supabase/apply/20261110190000_retire_review_steps_revert.sql.

drop function if exists public.approve_reviewed_draft(uuid, integer);
drop function if exists public.approve_draft(uuid);
drop function if exists public.submit_draft(uuid, integer);
drop function if exists public.send_back_draft(uuid, integer, text);

revoke update on public.draft from authenticated;
revoke update (payload, status, submitted_at, note) on public.draft from authenticated;
drop policy if exists draft_update on public.draft;
