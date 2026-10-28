-- ParaPo — only a draft's maker changes it: draft_update, tightened.
--
-- Ticket studio-maps/05, .scratch/studio-maps/spec.md ("One draft at a time per
-- route or hotspot ... can look, not change"). 0018 let any editor update any
-- draft ("whose draft may be changed is the studio's rule"), so the rule lived
-- only in the studio: an old tab, or a script with an editor's session, could
-- overwrite another editor's draft with a direct update. Now the database says
-- it too: an editor updates a draft they made, or one whose maker's account is
-- gone (editor_id null, set null on delete).
--
-- What does not change: submit, send back, approve, refresh_draft_base,
-- discard and take-down are security-definer functions owned by postgres, and
-- the table does not force row security, so they still act on any draft for
-- any editor (approving and sending back stay open to every editor, as the
-- spec says). Select, insert and delete policies are untouched; discarding is
-- the 7-day rule's business, which waits on the owner.
--
-- Not applied by the session that wrote it: the owner applies it, as postgres,
-- from supabase/apply/20261026090000_draft_update_own_apply.sql, then records
-- the ledger version in migrations/README.md. Safe to run twice.
--
-- Reverse (restores 0018's policy; supabase/apply/..._revert.sql does it and
-- removes the ledger row):
--   drop policy if exists draft_update on public.draft;
--   create policy draft_update on public.draft for update to authenticated
--     using ((select private.is_editor())) with check ((select private.is_editor()));

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
