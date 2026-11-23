-- ParaPo — checks after applying the drop_dead_weight migration.
--
-- Two parts. The first adds a test account with a ride and a test route, proves the behaviour, and
-- rolls every one of them back: it raises "FAILED: ..." on the first wrong result, and nothing it
-- did remains. It proves that delete_my_account(false) still deletes the person and keeps the
-- ride, unlinked, now that gps_session is gone; that anything but false is still refused first;
-- and that a route is still read whole and published through the draft functions without the two
-- columns. The second part is read-only: one row per check, every ok should be t.

-- Part one: the behaviour, rolled back.
begin;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;
grant execute on function pg_temp.check(boolean, text) to authenticated;

-- Ids start 7e7e7e84 so nothing live shares them.
insert into auth.users (id, is_anonymous) values ('7e7e7e84-0000-0000-0000-0000000000a1', false);
select set_config('request.jwt.claim.sub', '7e7e7e84-0000-0000-0000-0000000000a1', true);
insert into public.contributor (id) values ('7e7e7e84-0000-0000-0000-0000000000a1');
insert into public.contribution (id, contributor_id, format_version, rules_version, consent_version,
  started_at, ended_at, sent_at, distance_m, moving_s, standing_s, lost_s, point_count, events, gaps, start_name)
values ('7e7e7e84-0000-0000-0000-0000000000c1', '7e7e7e84-0000-0000-0000-0000000000a1', 2, 2, 1,
  now() - interval '2 hours', now() - interval '1 hour', now(), 100, 60, 10, 0, 2, '[]', '[]', 'Cubao');

set role authenticated;
do $$ begin
  perform public.delete_my_account(true);
  raise exception 'FAILED: delete_my_account(true) was not refused';
exception when raise_exception then
  if sqlerrm not like 'delete_uploads_refused:%' then raise; end if;
end $$;
select public.delete_my_account(false);
reset role;
select pg_temp.check(not exists (select 1 from auth.users where id = '7e7e7e84-0000-0000-0000-0000000000a1')
    and exists (select 1 from public.contribution where id = '7e7e7e84-0000-0000-0000-0000000000c1'
                  and contributor_id is null and unlinked and start_name is null),
  'delete_my_account(false) deletes the person and keeps the ride unlinked, with gps_session gone');

-- A route read whole and published without the two columns.
insert into auth.users (id, is_anonymous) values ('7e7e7e84-0000-0000-0000-0000000000e1', false);
insert into private.editor (user_id) values ('7e7e7e84-0000-0000-0000-0000000000e1');
set role authenticated;
select set_config('request.jwt.claim.sub', '7e7e7e84-0000-0000-0000-0000000000e1', true);
select public.claim_draft('route', '7e7e7e84-0000-0000-0000-0000000000b1', true, null,
  jsonb_build_object('version', 1,
    'route', jsonb_build_object('signboard', 'Dead weight check', 'mode', 'jeepney', 'fare_note', null, 'via', null,
      'head_stop_id', null, 'tail_stop_id', null, 'is_loop', true),
    'directions', jsonb_build_array(jsonb_build_object('id', '7e7e7e84-0000-0000-0000-0000000000c2',
      'reversed', false, 'control_points', '[]'::jsonb, 'segments', '[]'::jsonb, 'overview', null,
      'shape', '{"type":"LineString","coordinates":[[121.3,14.6],[121.31,14.61],[121.3,14.6]]}'::jsonb,
      'signboards', '[]'::jsonb, 'links', '[]'::jsonb))));
select pg_temp.check(public.publish_draft(d.id, d.revision) ->> 'code' = 'approved', 'a route is published')
  from public.draft d where d.subject_id = '7e7e7e84-0000-0000-0000-0000000000b1';
select pg_temp.check((select count(*) = 1 from public.route r where r.id = '7e7e7e84-0000-0000-0000-0000000000b1'
      and not (to_jsonb(r) ? 'short_name') and not (to_jsonb(r) ? 'fare_as_of')),
  'and read whole, without short_name or fare_as_of');
reset role;

rollback;

-- Part two: read-only.
select * from (values
  (1, 'gps_session is gone', (select to_regclass('public.gps_session') is null)),
  (2, 'route.short_name and route.fare_as_of are gone',
   (select not exists (select 1 from information_schema.columns where table_schema = 'public'
                         and table_name = 'route' and column_name in ('short_name', 'fare_as_of')))),
  (3, 'route_variant_route_id_idx is gone; route_variant_one_per_direction (route_id, reversed) stays',
   (select to_regclass('public.route_variant_route_id_idx') is null
       and pg_get_indexdef('public.route_variant_one_per_direction'::regclass) like '%(route_id, reversed)%')),
  (4, 'delete_my_account names no gps_session and is still the editors'' and accounts''',
   (select prosrc not like '%gps_session%' and prosecdef
       and has_function_privilege('authenticated', oid, 'execute')
       and not has_function_privilege('anon', oid, 'execute')
      from pg_proc where oid = 'public.delete_my_account(boolean)'::regprocedure)),
  (5, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'drop_dead_weight'))
) as c(n, what, ok) order by n;
