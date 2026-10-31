-- ParaPo — checks after applying the contribution_fare migration.
--
-- Two parts. The first adds a test phone and its rides, proves the behaviour,
-- and rolls every one of them back: it raises "FAILED: ..." on the first wrong
-- result, and nothing it did remains. It proves that a payload without a fare
-- (every app in the field) saves with none, that a fare saves, that a negative,
-- an over-2000 and an unreadable fare are refused, and that get_my_stats adds
-- up the fares of live rides and of retired months alike, the same before
-- and after retiring two months in turn. The second part is read-only: one row per check,
-- every ok should be t.

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
exception when check_violation or invalid_text_representation or numeric_value_out_of_range then null;
end $$;
grant execute on function pg_temp.refused(jsonb, text) to authenticated;

insert into auth.users (id, is_anonymous) values ('00000000-0000-0000-0000-00000000fa01', true)
on conflict (id) do nothing;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000fa01', false);
select pg_temp.check(public.save_contribution(pg_temp.recording(
  '11111111-0000-0000-0000-00000000fa01', now() - interval '3 hours', '{}')) = 'saved',
  'a payload with no fare saves, as every app in the field sends it');
select pg_temp.check(public.save_contribution(pg_temp.recording(
  '11111111-0000-0000-0000-00000000fa02', now() - interval '6 hours', '{"fare_php": 45.5}')) = 'saved',
  'a fare saves');
select pg_temp.check(public.save_contribution(pg_temp.recording(
  '11111111-0000-0000-0000-00000000fa03', now() - interval '9 hours', '{"fare_php": 20}')) = 'saved',
  'another fare saves');
select pg_temp.check(public.save_contribution(pg_temp.recording(
  '11111111-0000-0000-0000-00000000fa05', now() - interval '15 hours', '{"fare_php": 10}')) = 'saved',
  'a third fare saves');
select pg_temp.refused(pg_temp.recording('11111111-0000-0000-0000-00000000fa04', now() - interval '12 hours',
  '{"fare_php": -1}'), 'a negative fare');
select pg_temp.refused(pg_temp.recording('11111111-0000-0000-0000-00000000fa04', now() - interval '12 hours',
  '{"fare_php": 2000.01}'), 'a fare over 2000');
select pg_temp.refused(pg_temp.recording('11111111-0000-0000-0000-00000000fa04', now() - interval '12 hours',
  '{"fare_php": "a lot"}'), 'a fare that is not a number');
reset role;
select pg_temp.check((select fare_php is null from public.contribution
  where id = '11111111-0000-0000-0000-00000000fa01'), 'no fare is stored as null');
select pg_temp.check((select fare_php = 45.50 from public.contribution
  where id = '11111111-0000-0000-0000-00000000fa02'), 'the fare is stored as sent');

set role authenticated;
select pg_temp.check((select (fare_php_total, fare_recordings) = (75.50::numeric, 3) from public.get_my_stats()),
  'the stats add up the three fares, from 3 rides');
reset role;

-- Two old months retire in turn, the second adding onto the first's carry: one fared ride in
-- February, a fared ride and the one without in March. The totals stay.
update public.contribution set received_at = timestamptz '2024-02-15 12:00+00',
    started_at = timestamptz '2024-02-10 01:00+00', ended_at = timestamptz '2024-02-10 02:00+00'
  where id = '11111111-0000-0000-0000-00000000fa02';
update public.contribution set received_at = timestamptz '2024-03-15 12:00+00',
    started_at = timestamptz '2024-03-10 01:00+00', ended_at = timestamptz '2024-03-10 02:00+00'
  where id in ('11111111-0000-0000-0000-00000000fa01', '11111111-0000-0000-0000-00000000fa05');
select private.retire_month(date '2024-02-01', 0);
select private.retire_month(date '2024-03-01', 0);
select pg_temp.check((select (fare_php_total, fare_recordings) = (55.50::numeric, 2)
    from private.contributor_retired_totals where contributor_id = '00000000-0000-0000-0000-00000000fa01'),
  'the two retired months carried their fares and their two fared rides');
set role authenticated;
select pg_temp.check((select (fare_php_total, fare_recordings, rides) = (75.50::numeric, 3, 4)
    from public.get_my_stats()),
  'after retiring, the stats are the carry plus the live ride: the same');
reset role;

rollback;

-- Part two: read-only.
select * from (values
  (1, 'contribution.fare_php is a nullable numeric(7,2), checked 0 to 2000',
   (select is_nullable = 'YES' and data_type = 'numeric' and numeric_precision = 7 and numeric_scale = 2
      from information_schema.columns
      where table_schema = 'public' and table_name = 'contribution' and column_name = 'fare_php')
   and (select count(*) = 1 from pg_constraint where conrelid = 'public.contribution'::regclass
      and contype = 'c' and pg_get_constraintdef(oid) like '%fare_php%2000%')),
  (2, 'the retired totals carry fare_php_total and fare_recordings',
   (select count(*) = 2 from information_schema.columns where table_schema = 'private'
      and table_name = 'contributor_retired_totals' and column_name in ('fare_php_total', 'fare_recordings'))),
  (3, 'get_my_stats: returns the two fare columns, a definer with a pinned path, for authenticated only',
   (select prosecdef and proconfig @> array['search_path=""']
      and proargnames @> array['fare_php_total', 'fare_recordings']
      and has_function_privilege('authenticated', oid, 'execute')
      and not has_function_privilege('anon', oid, 'execute')
      and not has_function_privilege('public', oid, 'execute')
      from pg_proc where oid = 'public.get_my_stats()'::regprocedure)),
  (4, 'save_contribution reads the fare and still runs as the caller, for authenticated only',
   (select not prosecdef and position('fare_php' in prosrc) > 0
      and has_function_privilege('authenticated', oid, 'execute')
      and not has_function_privilege('anon', oid, 'execute')
      from pg_proc where oid = 'public.save_contribution(jsonb)'::regprocedure)),
  (5, 'the private helpers stay out of the API''s reach',
   (select count(*) = 2 and bool_and(prosecdef and not has_function_privilege('authenticated', oid, 'execute')
      and not has_function_privilege('anon', oid, 'execute'))
      from pg_proc where pronamespace = 'private'::regnamespace
      and proname in ('ride_totals', 'add_retired_totals'))),
  (6, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'contribution_fare'))
) as c(n, what, ok) order by n;
