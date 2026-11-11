-- ParaPo — apply 20261112100000_drop_inert_write_policies.sql to the live project, in one run.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it once. One transaction: it
-- checks the project first, applies supabase/migrations/20261112100000_drop_inert_write_policies.sql
-- (copied below unchanged), checks the result, and writes the ledger row. If any check fails it
-- raises, and nothing at all is changed, ledger included. A second run stops at step 1 and changes
-- nothing. Afterwards: 20261112100000_drop_inert_write_policies_check.sql (it adds a test editor, a
-- test account, two places and a route, and rolls them back).
-- Undo: 20261112100000_drop_inert_write_policies_revert.sql.
--
-- Safe to apply at any time after lock_map_tables: it changes what no role can do.

begin;

-- 1. Before: lock_map_tables is in the ledger, this has not run, and no app role holds a write
--    grant on the four tables, so the policies about to go decide nothing.
do $$
declare t text;
begin
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'drop_inert_write_policies') then
    raise exception 'drop_inert_write_policies: already applied. Nothing was changed.';
  end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where name = 'lock_map_tables') then
    raise exception 'drop_inert_write_policies: 20261105190000_lock_map_tables is not applied here. Nothing was changed.';
  end if;
  foreach t in array array['public.route', 'public.route_variant', 'public.stop', 'public.route_stop'] loop
    if has_table_privilege('authenticated', t, 'insert') or has_table_privilege('authenticated', t, 'update')
       or has_table_privilege('authenticated', t, 'delete')
       or has_any_column_privilege('authenticated', t, 'insert')
       or has_any_column_privilege('authenticated', t, 'update')
       or has_table_privilege('anon', t, 'insert') or has_table_privilege('anon', t, 'update')
       or has_table_privilege('anon', t, 'delete')
       or has_any_column_privilege('anon', t, 'insert')
       or has_any_column_privilege('anon', t, 'update') then
      raise exception 'drop_inert_write_policies: an app role can still write %, so its write policies are in use. Nothing was changed.', t;
    end if;
  end loop;
end $$;

-- >>> supabase/migrations/20261112100000_drop_inert_write_policies.sql, unchanged
-- ParaPo — the write policies on the four map tables go: they let nothing through.
--
-- 0005 and 0015 gave route, route_variant, stop and route_stop an insert, an
-- update and a delete policy each, for editors. Since lock_map_tables no app
-- role holds the grants those policies would apply to: anon lost its writes in
-- 0017, authenticated in lock_map_tables, and the map changes only through the
-- draft functions, which run with their owner's rights and are not subject to
-- these policies. So the twelve policies decide nothing. They are dropped so
-- the rules on these tables say what is true: read policies only.
--
-- Kept as they are:
--   - both read policies on each table (<table>_read_approved for anon and
--     authenticated, <table>_read_editor for editors). They are not merged
--     into one: a single policy would make anon evaluate private.is_editor(),
--     which anon may not run, and every public read would fail.
--   - takedown's two read policies. The nightly publish reads takedowns with
--     the publishable key (scripts/publish/read-database.mjs).
--   - row level security itself, on all four tables.
--
-- No data, grant or function changes. What every role can read and write is
-- the same before and after; supabase/verify/drop-inert-write-policies.sh
-- runs the publish's reads either side and compares them.
--
-- Order: after 20261105190000_lock_map_tables (its apply refuses without it,
-- and refuses if any app role still holds a write grant on these tables).
-- Not applied by the session that wrote it: the owner applies it, as postgres,
-- from supabase/apply/20261112100000_drop_inert_write_policies_apply.sql,
-- then records the ledger version. Safe to run twice. Undo:
-- supabase/apply/20261112100000_drop_inert_write_policies_revert.sql.

drop policy if exists route_insert on public.route;
drop policy if exists route_update on public.route;
drop policy if exists route_delete on public.route;
drop policy if exists route_variant_insert on public.route_variant;
drop policy if exists route_variant_update on public.route_variant;
drop policy if exists route_variant_delete on public.route_variant;
drop policy if exists stop_insert on public.stop;
drop policy if exists stop_update on public.stop;
drop policy if exists stop_delete on public.stop;
drop policy if exists route_stop_insert on public.route_stop;
drop policy if exists route_stop_update on public.route_stop;
drop policy if exists route_stop_delete on public.route_stop;
-- <<< supabase/migrations/20261112100000_drop_inert_write_policies.sql

-- 2. After: the twelve write policies are gone; the read policies, takedown's and row level
--    security are as they were.
do $$
declare
  left_over text;
  missing text;
  t text;
begin
  select string_agg(policyname, ', ') into left_over
  from pg_policies
  where schemaname = 'public' and tablename in ('route', 'route_variant', 'stop', 'route_stop')
    and cmd <> 'SELECT';
  if left_over is not null then
    raise exception 'drop_inert_write_policies: still there: %. Nothing was changed.', left_over;
  end if;
  select string_agg(w, ', ') into missing
  from unnest(array['route_read_approved', 'route_read_editor', 'route_variant_read_approved',
    'route_variant_read_editor', 'stop_read_approved', 'stop_read_editor', 'route_stop_read_approved',
    'route_stop_read_editor', 'takedown_read_editor', 'takedown_read_public']) w
  where not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.policyname = w and p.cmd = 'SELECT');
  if missing is not null then
    raise exception 'drop_inert_write_policies: a read policy is missing: %. Nothing was changed.', missing;
  end if;
  foreach t in array array['public.route', 'public.route_variant', 'public.stop', 'public.route_stop'] loop
    if not (select relrowsecurity from pg_class where oid = t::regclass) then
      raise exception 'drop_inert_write_policies: row level security is off on %. Nothing was changed.', t;
    end if;
  end loop;
end $$;

-- 3. The ledger row, under the file's name. The version is now, or one past the newest row's
--    where another migration was recorded in this same second.
insert into supabase_migrations.schema_migrations (version, name, statements)
select greatest(to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
                (select (max(version)::bigint + 1)::text from supabase_migrations.schema_migrations
                 where version ~ '^[0-9]{14}$')),
       'drop_inert_write_policies', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'drop_inert_write_policies');

commit;
