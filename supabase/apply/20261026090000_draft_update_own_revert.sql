-- ParaPo — undo draft_update_own: 0018's policy comes back, so any editor can
-- update any draft again. Touches no data. Safe to run twice.
begin;
drop policy if exists draft_update on public.draft;
create policy draft_update on public.draft for update to authenticated
  using ((select private.is_editor())) with check ((select private.is_editor()));
delete from supabase_migrations.schema_migrations where name = 'draft_update_own';
commit;
