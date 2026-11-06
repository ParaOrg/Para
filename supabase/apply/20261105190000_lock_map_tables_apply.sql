-- ParaPo — apply 20261105190000_lock_map_tables.sql to the live project, in one run.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it once. One transaction: it
-- checks the project first, applies supabase/migrations/20261105190000_lock_map_tables.sql (copied
-- below unchanged), checks the result, and writes the ledger row. If any check fails it raises,
-- and nothing at all is changed, ledger included. A second run stops at step 1 and changes nothing.
-- Afterwards: 20261105190000_lock_map_tables_check.sql (it adds a test editor, a place and drafts,
-- and rolls them back). Undo: 20261105190000_lock_map_tables_revert.sql.
--
-- Safe to apply now: the studio on main and on staging writes the map only through the draft
-- functions.

begin;

-- 1. Before: draft_published is in the ledger and this has not run.
do $$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'lock_map_tables') then
    raise exception 'lock_map_tables: already applied. Nothing was changed.';
  end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where name = 'draft_published') then
    raise exception 'lock_map_tables: 20261105160000_draft_published is not applied here. Nothing was changed.';
  end if;
end $$;

-- >>> supabase/migrations/20261105190000_lock_map_tables.sql, unchanged
-- ParaPo — the map tables are written only through the draft functions:
-- editors lose the direct insert, update and delete on route, route_variant,
-- stop and route_stop.
--
-- Clean-up step 4 of .scratch/codebase-review/database.md (H1). 0005 and 0015
-- let any editor insert, update or delete those four tables directly. The
-- studio stopped writing them directly: since production turned drafts on, and
-- in code since #748 removed the direct-write path. Every change to the map
-- goes through claim_draft, save_draft and publish_draft (or take_down,
-- put_back, unpublish), which run with their owner's rights and keep working.
-- The grants were left over, so an old cached studio build, a script or an
-- editor's browser console could still change or hard-delete published rows
-- with no draft, no publish and no takedown record; a direct DELETE of a
-- route cascades to its directions and links.
--
-- Now authenticated keeps select only. The write policies of 0005 and 0015
-- stay: without the grants they let nothing through, and a later tidy-up can
-- drop them. anon has had no writes since 0017. service_role, which the
-- overview backfill (scripts/publish/backfill-overview.mjs) writes with, is
-- unchanged.
--
-- Safe to apply now: the studio on main and on staging writes these tables
-- only through the draft functions.
--
-- Order: after 20261105160000_draft_published (its apply refuses without it).
-- Not applied by the session that wrote it: the owner applies it, as
-- postgres, from supabase/apply/20261105190000_lock_map_tables_apply.sql,
-- then records the ledger version. Safe to run twice. Undo:
-- supabase/apply/20261105190000_lock_map_tables_revert.sql.

revoke insert, update, delete on public.route, public.route_variant, public.stop, public.route_stop
  from authenticated;
-- <<< supabase/migrations/20261105190000_lock_map_tables.sql

-- 2. After: no app role writes the four tables directly; authenticated still reads them.
do $$
declare t text;
begin
  foreach t in array array['public.route', 'public.route_variant', 'public.stop', 'public.route_stop'] loop
    if has_table_privilege('authenticated', t, 'insert') or has_table_privilege('authenticated', t, 'update')
       or has_table_privilege('authenticated', t, 'delete')
       or has_any_column_privilege('authenticated', t, 'insert')
       or has_any_column_privilege('authenticated', t, 'update') then
      raise exception 'lock_map_tables: authenticated can still write %. Nothing was changed.', t;
    end if;
    if not has_table_privilege('authenticated', t, 'select') then
      raise exception 'lock_map_tables: authenticated lost select on %. Nothing was changed.', t;
    end if;
  end loop;
end $$;

-- 3. The ledger row, once.
insert into supabase_migrations.schema_migrations (version, name, statements)
select greatest(to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
                (select (max(version)::bigint + 1)::text from supabase_migrations.schema_migrations
                 where version ~ '^[0-9]{14}$')),
       'lock_map_tables', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'lock_map_tables');

commit;
