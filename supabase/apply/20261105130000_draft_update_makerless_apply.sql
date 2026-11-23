-- ParaPo — apply 20261105130000_draft_update_makerless.sql to the live project, in one run.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it once.
-- One transaction: it checks the project first, applies
-- supabase/migrations/20261105130000_draft_update_makerless.sql (copied below
-- unchanged), checks the result, and writes the ledger row. If any check fails
-- it raises, and nothing at all is changed, ledger included. A second run stops
-- at step 1 and changes nothing. Afterwards:
-- 20261105130000_draft_update_makerless_check.sql (it adds test editors and a
-- draft and rolls them back). Undo: 20261105130000_draft_update_makerless_revert.sql.
--
-- Touches one policy; no table, no grant, no row.

begin;

-- 1. Before: review_rules is in the ledger and this has not run.
do $$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'draft_update_makerless') then
    raise exception 'draft_update_makerless: already applied. Nothing was changed.';
  end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where name = 'review_rules') then
    raise exception 'draft_update_makerless: 20261105120000_review_rules is not applied here. Nothing was changed.';
  end if;
end $$;

-- >>> supabase/migrations/20261105130000_draft_update_makerless.sql, unchanged
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
-- <<< supabase/migrations/20261105130000_draft_update_makerless.sql

-- 2. After: draft_update accepts the maker or a maker-less draft, and editor_id
--    is still not an updatable column.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'draft'
      and policyname = 'draft_update' and cmd = 'UPDATE' and roles = '{authenticated}'
      and qual like '%IS NULL%' and with_check like '%IS NULL%' and with_check like '%uid%'
  ) then
    raise exception 'draft_update_makerless: draft_update is not the maker''s or a maker-less draft''s. Nothing was changed.';
  end if;
  if has_table_privilege('authenticated', 'public.draft', 'update')
     or has_column_privilege('authenticated', 'public.draft', 'editor_id', 'update') then
    raise exception 'draft_update_makerless: authenticated may update editor_id. Nothing was changed.';
  end if;
end $$;

-- 3. The ledger row, once.
insert into supabase_migrations.schema_migrations (version, name, statements)
select greatest(to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
                (select (max(version)::bigint + 1)::text from supabase_migrations.schema_migrations
                 where version ~ '^[0-9]{14}$')),
       'draft_update_makerless', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'draft_update_makerless');

commit;
