-- ParaPo — undo draft_update_makerless: draft_update's with check is the maker's
-- alone again, as 20261105120000_review_rules left it, so a draft whose maker is
-- gone cannot be edited directly. Touches no data. Safe to run twice.
begin;
drop policy if exists draft_update on public.draft;
create policy draft_update on public.draft for update to authenticated
  using (
    (select private.is_editor())
    and (editor_id = (select auth.uid()) or editor_id is null)
  )
  with check (
    (select private.is_editor())
    and editor_id = (select auth.uid())
  );
delete from supabase_migrations.schema_migrations where name = 'draft_update_makerless';
commit;
