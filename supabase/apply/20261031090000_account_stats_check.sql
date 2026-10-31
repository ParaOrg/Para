-- ParaPo — checks after applying the account_stats migration.
--
-- Two parts. The first adds test phones, an account and rides, proves the
-- behaviour, and rolls every one of them back: it raises "FAILED: ..." on the
-- first wrong result, and nothing it did remains. It proves that a recording
-- saves with the walk and ride split and without it (an older app), that a
-- half, negative or oversized split is refused, that each user reads only their
-- own stats, that anon cannot call get_my_stats, that a hidden ride is left
-- out, that retiring a month (private.retire_month(month, 0) on a month in
-- 2024 that holds only the test rides) leaves every number the same, carried
-- plus live, and carries nothing twice, that a deleted ride is no longer
-- counted, and that a claim moves the retired totals to the account.
-- The second part is read-only: one row per check, every ok should be t.
-- Privileges are read with has_*_privilege, which counts PUBLIC and inherited grants.

-- Part one: the behaviour, rolled back.
begin;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;
grant execute on function pg_temp.check(boolean, text) to anon, authenticated;

-- A recording as the phone sends it: an hour long, no points, two hintos near its
-- ends and one mid-ride, two marks. `extra` adds or replaces keys.
create function pg_temp.recording(id uuid, started timestamptz, extra jsonb) returns jsonb
language sql as $$
  select jsonb_build_object(
    'id', id, 'format_version', 2, 'rules_version', 2, 'consent_version', 1,
    'started_at', started, 'ended_at', started + interval '1 hour', 'sent_at', started + interval '1 hour',
    'vehicle', 'jeep', 'start_name', 'A', 'end_name', 'B', 'description', '',
    'distance_m', 5000, 'moving_s', 3000, 'standing_s', 500, 'lost_s', 100, 'point_count', 0,
    'events', jsonb_build_array(
      jsonb_build_object('kind', 'start', 'at', started),
      jsonb_build_object('kind', 'mode', 'at', started, 'to', 'walk'),
      jsonb_build_object('kind', 'mark', 'at', started + interval '5 minutes'),
      jsonb_build_object('kind', 'mode', 'at', started + interval '10 minutes', 'to', 'ride'),
      jsonb_build_object('kind', 'mark', 'at', started + interval '20 minutes')),
    'gaps', '[]'::jsonb,
    'line', jsonb_build_object('type', 'LineString', 'coordinates',
      '[[121.0,14.0],[121.001,14.0],[121.003,14.0],[121.005,14.0],[121.007,14.0],[121.0075,14.0]]'::jsonb),
    'west', 121.0, 'south', 14.0, 'east', 121.0075, 'north', 14.0,
    'batches', '[]'::jsonb,
    'hintos', jsonb_build_array(
      jsonb_build_object('seq', 0, 'started_at', started, 'seconds', 30, 'lat', 14.0, 'lng', 121.0005),
      jsonb_build_object('seq', 1, 'started_at', started, 'seconds', 40, 'lat', 14.0, 'lng', 121.004),
      jsonb_build_object('seq', 2, 'started_at', started, 'seconds', 50, 'lat', 14.0, 'lng', 121.0074))
  ) || extra;
$$;
grant execute on function pg_temp.recording(uuid, timestamptz, jsonb) to authenticated;
create function pg_temp.split(walk_m integer, ride_m integer, walk_s integer, ride_s integer) returns jsonb
language sql as $$
  select jsonb_build_object('walk_m', walk_m, 'ride_m', ride_m, 'walk_s', walk_s, 'ride_s', ride_s);
$$;
grant execute on function pg_temp.split(integer, integer, integer, integer) to authenticated;

-- A refused save raises check_violation, which the app reads as refused.
create function pg_temp.refused(payload jsonb, what text) returns void language plpgsql as $$
begin
  perform public.save_contribution(payload);
  raise exception 'FAILED: saved %', what;
exception when check_violation then null;
end $$;
grant execute on function pg_temp.refused(jsonb, text) to authenticated;

insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-00000000a5a1', true),
  ('00000000-0000-0000-0000-00000000a5a2', true),
  ('00000000-0000-0000-0000-00000000a5c1', false)
on conflict (id) do nothing;

-- ------------------------------------------------------------------ saving

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a5a1', false);
-- With the split, without it (an older app), and the split must be whole and add up.
select pg_temp.check(public.save_contribution(pg_temp.recording(
  '11111111-0000-0000-0000-00000000a501', now() - interval '3 hours', pg_temp.split(800, 4200, 600, 2900))) = 'saved',
  'a recording with the split saves');
select pg_temp.check(public.save_contribution(pg_temp.recording(
  '11111111-0000-0000-0000-00000000a502', now() - interval '6 hours', '{}')) = 'saved',
  'a recording without the split saves, as an older app sends it');
select pg_temp.check(public.save_contribution(pg_temp.recording(
  '11111111-0000-0000-0000-00000000a503', now() - interval '9 hours',
  pg_temp.split(0, 5001, 0, 3501) || '{"vehicle": "bus", "unknown_key": 1}')) = 'saved',
  'one metre and one second of rounding over the totals save, and an unknown key is ignored');
select pg_temp.refused(pg_temp.recording('11111111-0000-0000-0000-00000000a504', now() - interval '12 hours',
  '{"walk_m": 100, "ride_m": 4900}'), 'half a split');
select pg_temp.refused(pg_temp.recording('11111111-0000-0000-0000-00000000a504', now() - interval '12 hours',
  pg_temp.split(-1, 5000, 0, 3500)), 'a negative walk');
select pg_temp.refused(pg_temp.recording('11111111-0000-0000-0000-00000000a504', now() - interval '12 hours',
  pg_temp.split(1000, 4100, 0, 3500)), 'walk and ride over the distance');
select pg_temp.refused(pg_temp.recording('11111111-0000-0000-0000-00000000a504', now() - interval '12 hours',
  pg_temp.split(1000, 4000, 1000, 2600)), 'walk and ride over the moving and standing time');
reset role;
select pg_temp.check((select walk_m is null and ride_s is null from public.contribution
  where id = '11111111-0000-0000-0000-00000000a502'), 'the older app''s recording stored no split');
select pg_temp.check((select (walk_m, ride_m, walk_s, ride_s) = (800, 4200, 600, 2900) from public.contribution
  where id = '11111111-0000-0000-0000-00000000a501'), 'the split is stored as sent');

-- The second phone saves one; an editor hides one of the first phone's.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a5a2', false);
select public.save_contribution(pg_temp.recording(
  '11111111-0000-0000-0000-00000000a511', now() - interval '2 hours', pg_temp.split(0, 5000, 0, 3500)));
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a5a1', false);
select public.save_contribution(pg_temp.recording(
  '11111111-0000-0000-0000-00000000a505', now() - interval '15 hours', pg_temp.split(5000, 0, 3500, 0)));
reset role;
update public.contribution set hidden_at = now() where id = '11111111-0000-0000-0000-00000000a505';
insert into public.contribution_use (contribution_id, kind, subject_id, editor_id) values
  ('11111111-0000-0000-0000-00000000a501', 'direction', '22222222-0000-0000-0000-0000000000a1', null),
  ('11111111-0000-0000-0000-00000000a502', 'direction', '22222222-0000-0000-0000-0000000000a1', null),
  ('11111111-0000-0000-0000-00000000a502', 'hintuan', '22222222-0000-0000-0000-0000000000b1', null),
  ('11111111-0000-0000-0000-00000000a505', 'direction', '22222222-0000-0000-0000-0000000000c1', null);

-- ---------------------------------------------------------------- reading

set role anon;
do $$ begin perform public.get_my_stats(); raise exception 'FAILED: anon read stats';
exception when insufficient_privilege then null; end $$;
do $$ begin perform 1 from private.contributor_retired_totals; raise exception 'FAILED: anon read retired totals';
exception when insufficient_privilege then null; end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a5a1', false);
do $$ begin perform 1 from private.contributor_retired_totals; raise exception 'FAILED: a phone read retired totals';
exception when insufficient_privilege then null; end $$;
do $$ begin perform private.ride_totals('00000000-0000-0000-0000-00000000a5a2', '-infinity', 'infinity', null);
  raise exception 'FAILED: a phone ran ride_totals for another';
exception when insufficient_privilege then null; end $$;
-- Three of its own (the hidden one left out): 2 jeep and 1 bus, 15000 m, the split from two.
select pg_temp.check((select (rides, distance_m, moving_s, standing_s, walk_m, ride_m, walk_s, ride_s)
    = (3, 15000, 9000, 1500, 800, 9201, 600, 6401) from public.get_my_stats()),
  'the first phone''s own totals, the hidden ride left out');
select pg_temp.check((select (hinto_s, marks, jeep_rides, bus_rides, train_rides, routes_helped, hintuans_helped)
    = (360, 6, 2, 1, 0, 1, 1) from public.get_my_stats()),
  'hinto seconds, marks, vehicles and distinct routes and hintuans helped');
select pg_temp.check((select first_ride_at = (select min(started_at) from public.contribution
    where id in ('11111111-0000-0000-0000-00000000a501', '11111111-0000-0000-0000-00000000a502',
                 '11111111-0000-0000-0000-00000000a503'))
    and longest_ride_m = 5000 and active_days between 1 and 2 from public.get_my_stats()),
  'first ride, longest ride and active days');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a5a2', false);
select pg_temp.check((select (rides, distance_m, ride_m, routes_helped) = (1, 5000, 5000, 0)
  from public.get_my_stats()), 'the second phone sees only its own');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a5c1', false);
select pg_temp.check((select rides = 0 and distance_m = 0 and first_ride_at is null and longest_ride_m is null
  from public.get_my_stats()), 'an account with no rides reads zeros, one row');
select set_config('request.jwt.claim.sub', '', false);
do $$ begin perform public.get_my_stats(); raise exception 'FAILED: stats with no user';
exception when insufficient_privilege then null; end $$;
reset role;

-- ------------------------------------------------------------- retirement

-- Two of the first phone's rides (and its hidden one) and the second phone's move
-- to an old month, ridden on two days; the first phone keeps one live ride.
update public.contribution set received_at = timestamptz '2024-03-15 12:00+00',
    started_at = timestamptz '2024-03-09 23:30+00' + (right(id::text, 1)::integer * interval '12 hours'),
    ended_at = timestamptz '2024-03-10 00:30+00' + (right(id::text, 1)::integer * interval '12 hours')
  where id in ('11111111-0000-0000-0000-00000000a501', '11111111-0000-0000-0000-00000000a502',
               '11111111-0000-0000-0000-00000000a505', '11111111-0000-0000-0000-00000000a511');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a5a1', false);
create temp table before_stats as
  select '00000000-0000-0000-0000-00000000a5a1'::uuid as who, s.* from public.get_my_stats() s;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a5a2', false);
insert into before_stats select '00000000-0000-0000-0000-00000000a5a2', s.* from public.get_my_stats() s;
grant select on before_stats to authenticated;
select pg_temp.check((select active_days = 3 from before_stats
  where who = '00000000-0000-0000-0000-00000000a5a1'), 'two old days and today, before retiring');

select pg_temp.check((select (r ->> 'contributions')::integer = 4 and (r ->> 'hintos_deleted')::integer > 0
  from (select private.retire_month(date '2024-03-01', 0) r) x), 'the month retired, hintos near the ends deleted');
select pg_temp.check((select count(*) = 0 from public.contribution
  where received_at < '2024-04-01' and contributor_id is not null), 'the month is unlinked');
-- Running it again carries nothing twice.
select private.retire_month(date '2024-03-01', 0);

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a5a1', false);
select pg_temp.check((select row(s.*) = row(b.rides, b.distance_m, b.moving_s, b.standing_s, b.walk_m, b.ride_m,
    b.walk_s, b.ride_s, b.hinto_s, b.marks, b.jeep_rides, b.bus_rides, b.train_rides, b.ferry_rides,
    b.tricycle_rides, b.other_rides, b.active_days, b.first_ride_at, b.longest_ride_m, b.longest_ride_moving_s,
    b.routes_helped, b.hintuans_helped)
  from public.get_my_stats() s, before_stats b where b.who = '00000000-0000-0000-0000-00000000a5a1'),
  'the first phone''s totals are the same after retiring: carried plus live');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a5a2', false);
select pg_temp.check((select (s.rides, s.distance_m, s.ride_m, s.hinto_s, s.marks)
    = (b.rides, b.distance_m, b.ride_m, b.hinto_s, b.marks)
  from public.get_my_stats() s, before_stats b where b.who = '00000000-0000-0000-0000-00000000a5a2'),
  'the second phone''s, all retired, are the same');
reset role;
select pg_temp.check((select count(*) = 2 and sum(rides) = 3 from private.contributor_retired_totals
  where contributor_id in ('00000000-0000-0000-0000-00000000a5a1', '00000000-0000-0000-0000-00000000a5a2')),
  'one retired row per phone, the hidden ride not carried');

-- Deleting the live ride lowers the totals by it.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a5a1', false);
delete from public.contribution where id = '11111111-0000-0000-0000-00000000a503';
select pg_temp.check((select s.rides = b.rides - 1 and s.distance_m = b.distance_m - 5000
  from public.get_my_stats() s, before_stats b where b.who = '00000000-0000-0000-0000-00000000a5a1'),
  'a deleted ride is no longer counted');

-- ------------------------------------------------------------------ claim

-- The second phone's retired totals go to the account that claims it.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a5a2', false);
create temp table claim as select public.begin_claim() as token;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a5c1', false);
select public.finish_claim((select token from claim));
select pg_temp.check((select (s.rides, s.distance_m, s.ride_m) = (b.rides, b.distance_m, b.ride_m)
  from public.get_my_stats() s, before_stats b where b.who = '00000000-0000-0000-0000-00000000a5a2'),
  'the account has the claimed phone''s retired totals');
reset role;
select pg_temp.check((select not exists (select 1 from private.contributor_retired_totals
  where contributor_id = '00000000-0000-0000-0000-00000000a5a2')), 'the claimed phone''s row is gone');

-- Deleting a contributor takes its totals with it.
delete from public.contributor where id = '00000000-0000-0000-0000-00000000a5c1';
select pg_temp.check((select not exists (select 1 from private.contributor_retired_totals
  where contributor_id = '00000000-0000-0000-0000-00000000a5c1')), 'a deleted contributor''s totals go');

rollback;

-- Part two: read-only.
select * from (values
  (1, 'contribution has walk_m, ride_m, walk_s and ride_s, all nullable integers',
   (select count(*) = 4 and bool_and(is_nullable = 'YES' and data_type = 'integer')
      from information_schema.columns where table_schema = 'public' and table_name = 'contribution'
        and column_name in ('walk_m', 'ride_m', 'walk_s', 'ride_s'))),
  (2, 'the split is checked whole and against the totals',
   (select count(*) = 3 from pg_constraint where conrelid = 'public.contribution'::regclass
      and conname in ('contribution_split_whole', 'contribution_split_distance', 'contribution_split_time'))),
  (3, 'get_my_stats: a definer with a pinned path, for authenticated only',
   (select prosecdef and proconfig @> array['search_path=""']
      and has_function_privilege('authenticated', oid, 'execute')
      and not has_function_privilege('anon', oid, 'execute')
      and not has_function_privilege('public', oid, 'execute')
      from pg_proc where oid = 'public.get_my_stats()'::regprocedure)),
  (4, 'the retired totals have row security on and no API role reaches them',
   (select relrowsecurity
      and not has_table_privilege('anon', oid, 'select')
      and not has_table_privilege('authenticated', oid, 'select')
      and not has_table_privilege('authenticated', oid, 'insert')
      and not has_table_privilege('authenticated', oid, 'update')
      from pg_class where oid = 'private.contributor_retired_totals'::regclass)),
  (5, 'they go with their contributor',
   (select confdeltype = 'c' from pg_constraint
      where conrelid = 'private.contributor_retired_totals'::regclass and contype = 'f')),
  (6, 'the four private steps are definers with a pinned path, run by no API role',
   (select count(*) = 4 and bool_and(prosecdef and proconfig @> array['search_path=""']
      and not has_function_privilege('anon', oid, 'execute')
      and not has_function_privilege('public', oid, 'execute')
      and not has_function_privilege('authenticated', oid, 'execute'))
      from pg_proc where pronamespace = 'private'::regnamespace and proname in
      ('ride_totals', 'add_retired_totals', 'carry_retired_month', 'retire_month'))),
  (7, 'retire_month carries the month first; finish_claim moves the retired totals',
   (select position('carry_retired_month' in prosrc) > 0
      from pg_proc where oid = 'private.retire_month(date, integer)'::regprocedure)
   and (select position('add_retired_totals' in prosrc) > 0
      from pg_proc where oid = 'public.finish_claim(uuid)'::regprocedure)),
  (8, 'save_contribution reads the split and still runs as the caller, for authenticated only',
   (select not prosecdef and position('walk_m' in prosrc) > 0
      and has_function_privilege('authenticated', oid, 'execute')
      and not has_function_privilege('anon', oid, 'execute')
      from pg_proc where oid = 'public.save_contribution(jsonb)'::regprocedure)),
  (9, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'account_stats'))
) as c(n, what, ok) order by n;
