-- ParaPo — apply 20261112090000_route_end_indexes.sql to the live project, in one run.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it once. One transaction: it
-- checks the project first, applies supabase/migrations/20261112090000_route_end_indexes.sql
-- (copied below unchanged), checks the result, and writes the ledger row. If any check fails it
-- raises, and nothing at all is changed, ledger included. A second run stops at step 1 and changes
-- nothing. Afterwards: 20261112090000_route_end_indexes_check.sql (read-only).
-- Undo: 20261112090000_route_end_indexes_revert.sql.
--
-- Safe to apply at any time: it adds two indexes and changes no row, no function and no grant.

begin;

-- 1. Before: this has not run, and route has both end columns.
do $$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'route_end_indexes') then
    raise exception 'route_end_indexes: already applied. Nothing was changed.';
  end if;
  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'route'
        and column_name in ('head_stop_id', 'tail_stop_id')) <> 2 then
    raise exception 'route_end_indexes: public.route has no head_stop_id and tail_stop_id here. Nothing was changed.';
  end if;
end $$;

-- >>> supabase/migrations/20261112090000_route_end_indexes.sql, unchanged
-- ParaPo — an index on each of a route's two ends.
--
-- route.head_stop_id and route.tail_stop_id point at stop (0006) and have no
-- index. Postgres looks a stop up in both columns whenever a stop row is
-- deleted, to see that no route still ends there, and the rule that refuses
-- to take down a hotspot which ends an approved route
-- (private.stop_takedown_guard) looks the routes up by their ends. With no
-- index each lookup reads the whole route table. It is small today; these
-- keep the lookups short as the map grows.
--
-- Left as they are, on purpose: the indexes on the *_by columns
-- (route_last_saved_by_idx, route_published_by_idx, stop_last_saved_by_idx,
-- stop_published_by_idx, draft_last_saved_by_idx, takedown_put_back_by_idx).
-- The database advisor lists them as unused because no query of the app's
-- reads by them. They cover the foreign keys to auth.users, which Postgres
-- uses when a user is deleted, to set those columns to null. They must stay.
--
-- No data changes. Building each index holds off writes to route for a moment;
-- the table has a few dozen rows.
--
-- Not applied by the session that wrote it: the owner applies it, as postgres,
-- from supabase/apply/20261112090000_route_end_indexes_apply.sql, then records
-- the ledger version. Safe to run twice. Undo:
-- supabase/apply/20261112090000_route_end_indexes_revert.sql.

create index if not exists route_head_stop_id_idx on public.route (head_stop_id);
create index if not exists route_tail_stop_id_idx on public.route (tail_stop_id);
-- <<< supabase/migrations/20261112090000_route_end_indexes.sql

-- 2. After: both indexes are there, usable, each on its one column of public.route.
do $$
declare
  wanted record;
begin
  for wanted in
    select * from (values ('route_head_stop_id_idx', 'head_stop_id'), ('route_tail_stop_id_idx', 'tail_stop_id'))
      as w(index_name, column_name)
  loop
    if not exists (
      select 1
      from pg_index i
      join pg_class c on c.oid = i.indexrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
      where n.nspname = 'public' and c.relname = wanted.index_name
        and i.indrelid = 'public.route'::regclass
        and i.indnatts = 1 and a.attname = wanted.column_name
        and i.indisvalid and i.indisready and i.indpred is null
    ) then
      raise exception 'route_end_indexes: % on public.route (%) is missing or not usable. Nothing was changed.',
        wanted.index_name, wanted.column_name;
    end if;
  end loop;
end $$;

-- 3. The ledger row, under the file's name.
insert into supabase_migrations.schema_migrations (version, name, statements)
select to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'), 'route_end_indexes', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'route_end_indexes');

commit;
