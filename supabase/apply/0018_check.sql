-- ParaPo — after applying 0018: read-only checks, one row each.
--
-- Paste into the SQL editor (role: postgres) and run. Every row's ok should
-- be true. One select; it changes nothing. What anon reads is checked
-- through the API with the publishable key (the publish's own read):
-- supabase/apply/README.md.

select * from (
select 1, 'ledger row 0018_review, once', count(*) = 1, string_agg(version, ', ')
from supabase_migrations.schema_migrations where name = '0018_review'
union all
select 2, 'ledger row 0021_loops still there, once', count(*) = 1, string_agg(version, ', ')
from supabase_migrations.schema_migrations where name = '0021_loops'
union all
select 3, 'every route approved', count(*) filter (where status <> 'approved') = 0,
       count(*) || ' routes, ' || count(*) filter (where is_loop) || ' Ikot'
from public.route
union all
select 4, 'every hotspot approved', count(*) filter (where status <> 'approved') = 0, count(*) || ' hotspots'
from public.stop
union all
select 5, 'every Ikot has no ends and a signboard',
       count(*) filter (where head_stop_id is not null or tail_stop_id is not null or coalesce(btrim(signboard), '') = '') = 0,
       count(*) || ' Ikot'
from public.route where is_loop
union all
select 6, 'uniqueness reads approved rows (3 indexes)', count(*) = 3, string_agg(indexname, ', ')
from pg_indexes
where schemaname = 'public'
  and indexname in ('route_ends_unique', 'route_loop_unique', 'stop_terminal_place_unique')
  and indexdef like '%status = ''approved''%'
union all
select 7, 'route_loop_unique still only for Ikot', count(*) = 1, max(indexdef)
from pg_indexes where schemaname = 'public' and indexname = 'route_loop_unique' and indexdef like '%is_loop%'
union all
select 8, 'read rules: the 8 of 0018 and no other', count(*) = 8 and bool_and(policyname like '%\_read\_approved' or policyname like '%\_read\_editor'),
       string_agg(tablename || '.' || policyname, ', ' order by tablename, policyname)
from pg_policies
where schemaname = 'public' and tablename in ('route', 'route_variant', 'stop', 'route_stop') and cmd in ('SELECT', 'ALL')
union all
select 9, 'triggers in place (8)', count(*) = 8, string_agg(tgname, ', ' order by tgname)
from pg_trigger
where not tgisinternal and tgname in ('route_variant_bumps_route', 'route_revision', 'stop_revision', 'stop_touch',
  'route_approved_ends', 'stop_takedown_guard', 'route_takedown_log', 'stop_takedown_log')
union all
select 10, 'new tables have row security on (3)', count(*) = 3, string_agg(relname, ', ')
from pg_class where relnamespace = 'public'::regnamespace and relname in ('draft', 'takedown', 'editor_name') and relrowsecurity
union all
select 11, 'anon: no grant on draft or editor_name',
       not has_table_privilege('anon', 'public.draft', 'select') and not has_table_privilege('anon', 'public.editor_name', 'select'), null
union all
select 12, 'anon reads takedown dates but not who',
       has_column_privilege('anon', 'public.takedown', 'taken_down_at', 'select')
       and not has_column_privilege('anon', 'public.takedown', 'editor_id', 'select'), null
union all
select 13, 'anon still cannot write route or stop',
       not has_table_privilege('anon', 'public.route', 'insert,update,delete')
       and not has_table_privilege('anon', 'public.stop', 'insert,update,delete'), null
) checks (n, what, ok, seen)
order by n;
