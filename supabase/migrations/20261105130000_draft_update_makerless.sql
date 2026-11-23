-- ParaPo — a draft whose maker is gone can be edited by any editor again.
--
-- 20261105120000_review_rules tightened draft_update's with check to the
-- maker alone, so a draft whose maker's account is gone (editor_id null, set
-- null on delete) could no longer be edited directly: the row stays
-- maker-less, so every update failed the check. The owner's decision: any
-- editor may edit such a draft, as draft_update_own allowed. The studio
-- already treats it that way (data/draft-guard.ts lets anyone edit it).
--
-- This puts back draft_update_own's with check: the maker, or a maker-less
-- draft. A draft still cannot be handed to nobody: since review_rules an
-- editor updates only payload, status, submitted_at and note, never
-- editor_id, so a direct update cannot set editor_id to null, or to anyone.
--
-- Unchanged: the column grants, draft_delete (the maker's only), and
-- discard_draft (the maker, or anyone once the maker is gone).
--
-- Order: after 20261105120000_review_rules (its apply refuses without it).
-- Not applied by the session that wrote it: the owner applies it, as
-- postgres, from supabase/apply/20261105130000_draft_update_makerless_apply.sql,
-- then records the ledger version. Safe to run twice. Undo:
-- supabase/apply/20261105130000_draft_update_makerless_revert.sql.

drop policy if exists draft_update on public.draft;
create policy draft_update on public.draft for update to authenticated
  using (
    (select private.is_editor())
    and (editor_id = (select auth.uid()) or editor_id is null)
  )
  with check (
    (select private.is_editor())
    and (editor_id = (select auth.uid()) or editor_id is null)
  );
