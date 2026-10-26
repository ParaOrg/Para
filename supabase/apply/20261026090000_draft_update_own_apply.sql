-- ParaPo — apply 20261026090000_draft_update_own.sql to the live project, in one run.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it once.
-- One transaction: applies supabase/migrations/20261026090000_draft_update_own.sql
-- (copied below unchanged), then writes the ledger row. A second run stops at
-- step 1 and changes nothing. Afterwards run 20261026090000_draft_update_own_check.sql
-- (read-only). Undo: 20261026090000_draft_update_own_revert.sql.
-- Touches one policy; no table and no row.

begin;

-- 1. Before: this has not run, and 0018's draft table is there.
do $$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'draft_update_own') then
    raise exception 'draft_update_own: already applied. Nothing was changed.';
  end if;
  if to_regclass('public.draft') is null then
    raise exception 'draft_update_own: public.draft is missing (0018). Nothing was changed.';
  end if;
end $$;

-- 2. The migration, unchanged.
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

-- 3. The ledger row, once.
insert into supabase_migrations.schema_migrations (version, name, statements)
select greatest(to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
                (select (max(version)::bigint + 1)::text from supabase_migrations.schema_migrations
                 where version ~ '^[0-9]{14}$')),
       'draft_update_own', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'draft_update_own');

commit;
