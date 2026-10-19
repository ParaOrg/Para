-- Assertions on 20261019125900_contributions.sql. Runs on a database with every
-- migration applied and before-0018.sql's editor; every block raises on a wrong
-- result.
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;

-- Two phones (anonymous users) and the editor e1.
insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000a1', true),
  ('00000000-0000-0000-0000-0000000000b1', true),
  ('00000000-0000-0000-0000-0000000000e1', false)
on conflict (id) do nothing;

-- A recording as the phone sends it: n points 10 m apart, 2 s apart, starting
-- in Quezon City, in batches of 600.
create function pg_temp.recording(rid uuid, n integer, step_dlat integer default 90)
returns jsonb language sql as $$
  select jsonb_build_object(
    'id', rid, 'format_version', 1, 'rules_version', 1, 'consent_version', 1,
    'started_at', '2026-10-19T08:00:00Z', 'ended_at', '2026-10-19T08:30:00Z',
    'sent_at', '2026-10-19T08:31:00Z', 'vehicle', 'jeep',
    'start_name', 'Fairview', 'end_name', 'Cubao', 'description', 'Verify ride',
    'distance_m', n * 10, 'moving_s', n * 2, 'standing_s', 60, 'lost_s', 0, 'point_count', n,
    'events', '[{"kind":"start","at":"2026-10-19T08:00:00Z"}]'::jsonb, 'gaps', '[]'::jsonb,
    'line', '{"type":"LineString","coordinates":[[121.05,14.70],[121.05,14.71]]}'::jsonb,
    'west', 121.05, 'south', 14.70, 'east', 121.05, 'north', 14.71,
    'batches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'seq', b, 'first_at', '2026-10-19T08:00:00Z'::timestamptz + make_interval(secs => b * 1200),
        'first_lat', 14700000 + b * 600 * step_dlat, 'first_lng', 121050000,
        'point_count', least(600, n - b * 600),
        'dt_ms', (select jsonb_agg(case when i = 0 then 0 else 2000 end) from generate_series(0, least(600, n - b * 600) - 1) i),
        'dlat', (select jsonb_agg(case when i = 0 then 0 else step_dlat end) from generate_series(0, least(600, n - b * 600) - 1) i),
        'dlng', (select jsonb_agg(0) from generate_series(0, least(600, n - b * 600) - 1) i),
        'accuracy_m', (select jsonb_agg(5) from generate_series(0, least(600, n - b * 600) - 1) i),
        'speed_cms', null) order by b)
      from generate_series(0, (n - 1) / 600) b where n > 0), '[]'::jsonb),
    'hintos', '[{"seq":0,"started_at":"2026-10-19T08:10:00Z","seconds":90,"lat":14.705,"lng":121.05}]'::jsonb
  );
$$;
grant execute on function pg_temp.recording(uuid, integer, integer) to authenticated;

-- anon reaches nothing.
set role anon;
do $$ begin perform public.save_contribution('{}'); raise exception 'FAILED: anon ran save_contribution';
exception when insufficient_privilege then null; end $$;
do $$ begin perform 1 from public.contribution; raise exception 'FAILED: anon read contribution';
exception when insufficient_privilege then null; end $$;
do $$ begin perform 1 from public.point_batch; raise exception 'FAILED: anon read point_batch';
exception when insufficient_privilege then null; end $$;
do $$ begin perform 1 from public.hinto; raise exception 'FAILED: anon read hinto';
exception when insufficient_privilege then null; end $$;
do $$ begin perform 1 from public.contributor; raise exception 'FAILED: anon read contributor';
exception when insufficient_privilege then null; end $$;
reset role;

-- Phone A saves; a resend writes nothing and answers 'already saved'.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
select pg_temp.check(public.save_contribution(pg_temp.recording('11111111-0000-0000-0000-000000000001', 1300)) = 'saved', 'A saves');
select pg_temp.check(public.save_contribution(pg_temp.recording('11111111-0000-0000-0000-000000000001', 1300)) = 'already saved', 'A resend is already saved');
select pg_temp.check((select count(*) = 1 from public.contribution), 'A reads its one contribution');
select pg_temp.check((select contributor_id = '00000000-0000-0000-0000-0000000000a1' and received_at is not null and hidden_at is null
  from public.contribution), 'server stamped contributor and received_at');
select pg_temp.check((select count(*) = 0 from public.point_batch), 'A reads none of its points back');
select pg_temp.check((select count(*) = 1 and bool_and(id = '00000000-0000-0000-0000-0000000000a1') from public.contributor), 'A reads only its own contributor row');
-- Phone-sent server columns are overwritten.
select pg_temp.check(public.save_contribution(pg_temp.recording('11111111-0000-0000-0000-000000000002', 10)
  || '{"contributor_id":"00000000-0000-0000-0000-0000000000b1","hidden_at":"2026-01-01T00:00:00Z"}') = 'saved', 'A saves a second');
select pg_temp.check((select contributor_id = '00000000-0000-0000-0000-0000000000a1' and hidden_at is null
  from public.contribution where id = '11111111-0000-0000-0000-000000000002'), 'phone cannot set contributor or hidden');
do $$ begin
  insert into public.contribution (id, contributor_id, format_version, rules_version, consent_version,
    started_at, ended_at, sent_at, distance_m, moving_s, standing_s, lost_s, point_count, events, gaps, hidden_at)
  values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000b1', 1, 1, 1, now() - interval '1 hour', now(), now(),
    0, 0, 0, 0, 0, '[]', '[]', now());
  if exists (select 1 from public.contribution
    where contributor_id is distinct from '00000000-0000-0000-0000-0000000000a1' or hidden_at is not null) then
    raise exception 'FAILED: direct insert kept a foreign contributor_id or hidden_at';
  end if;
end $$;
do $$ begin update public.contribution set description = 'x'; raise exception 'FAILED: phone updated';
exception when insufficient_privilege then null; end $$;

-- Phone B sees none of A's, cannot resend over A's id, cannot delete A's.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
select pg_temp.check((select count(*) = 0 from public.contribution), 'B reads none of A''s');
do $$ begin perform public.save_contribution(pg_temp.recording('11111111-0000-0000-0000-000000000001', 10));
  raise exception 'FAILED: B saved over A''s id';
exception when sqlstate 'P0001' then
  if sqlerrm <> 'id_taken' then raise exception 'FAILED: B over A''s id: %', sqlerrm; end if; end $$;
delete from public.contribution where id = '11111111-0000-0000-0000-000000000001';
do $$ begin
  insert into public.point_batch (contribution_id, seq, month, first_at, first_lat, first_lng, point_count, dt_ms, dlat, dlng, accuracy_m)
  values ('11111111-0000-0000-0000-000000000001', 9, date_trunc('month', now())::date, now(), 14700000, 121050000, 1, '{0}', '{0}', '{0}', '{5}');
  raise exception 'FAILED: B added points to A''s';
exception when insufficient_privilege then null; end $$;
reset role;
select pg_temp.check((select count(*) = 3 from public.contribution where contributor_id = '00000000-0000-0000-0000-0000000000a1'), 'A''s survive B');

-- The editor reads everything and writes nothing but a delete (checked below).
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
select pg_temp.check((select count(*) = 3 from public.contribution), 'editor reads every contribution');
select pg_temp.check((select count(*) = 3 and sum(point_count) = 1300 from public.point_batch
  where contribution_id = '11111111-0000-0000-0000-000000000001'), 'editor reads 3 batches, 1300 points');
select pg_temp.check((select count(*) = 1 from public.hinto where contribution_id = '11111111-0000-0000-0000-000000000001'), 'editor reads the hinto');
select pg_temp.check((select count(*) = 1 from public.contributor), 'editor reads the one contributor');
do $$ begin update public.contribution set description = 'x'; raise exception 'FAILED: editor updated';
exception when insufficient_privilege then null; end $$;

-- Refused whole: too fast, outside the Philippines, too many points, bad totals, too long.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
create function pg_temp.refused(rec jsonb, reason text) returns void language plpgsql as $$
begin
  perform public.save_contribution(rec);
  raise exception 'FAILED: saved although %', reason;
exception when sqlstate 'P0001' or check_violation or invalid_text_representation then
  if sqlerrm like 'FAILED%' then raise; end if;
end $$;
-- 0.0009 degrees in 2 s is about 180 km/h.
select pg_temp.refused(pg_temp.recording(gen_random_uuid(), 50, 900), 'faster than 150 km/h');
select pg_temp.refused(pg_temp.recording(gen_random_uuid(), 50) || '{"west":100}', 'box outside');
select pg_temp.refused(jsonb_set(pg_temp.recording(gen_random_uuid(), 5), '{batches,0,first_lng}', '100000000'), 'point outside');
select pg_temp.refused(pg_temp.recording(gen_random_uuid(), 14401, 1), 'more than 14400 points');
select pg_temp.refused(pg_temp.recording(gen_random_uuid(), 50) || '{"point_count":51}', 'total disagrees with batches');
select pg_temp.refused(pg_temp.recording(gen_random_uuid(), 50) || '{"ended_at":"2026-10-19T15:00:00Z"}', 'longer than 6 hours');
select pg_temp.refused(jsonb_set(pg_temp.recording(gen_random_uuid(), 5), '{batches,0,dt_ms,2}', '0'), 'time not increasing');
select pg_temp.refused(pg_temp.recording(gen_random_uuid(), 5) || jsonb_build_object('description', repeat('x', 1001)), 'description too long');
select pg_temp.check((select count(*) = 0 from public.contribution), 'no refused recording left a row');
reset role;
select pg_temp.check((select count(*) = 0 from public.point_batch b join public.contribution c on c.id = b.contribution_id
  where c.contributor_id = '00000000-0000-0000-0000-0000000000b1'), 'no refused recording left points');
select pg_temp.check((select count(*) = 0 from public.point_batch_default), 'the default piece is empty');

-- The day cap: B's 21st in 24 hours is refused; a resend of one of the 20 still answers.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
select public.save_contribution(pg_temp.recording(('22222222-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid, 2))
  from generate_series(1, 20) i;
select pg_temp.refused(pg_temp.recording(gen_random_uuid(), 2), 'the 21st in a day');
select pg_temp.check(public.save_contribution(pg_temp.recording('22222222-0000-0000-0000-000000000020', 2)) = 'already saved', 'a resend at the cap is already saved');

-- A blocked phone adds nothing and cannot unblock itself.
reset role;
update public.contributor set blocked_at = now(), blocked_by = '00000000-0000-0000-0000-0000000000e1'
  where id = '00000000-0000-0000-0000-0000000000a1';
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
do $$ begin perform public.save_contribution(pg_temp.recording(gen_random_uuid(), 2));
  raise exception 'FAILED: a blocked phone saved';
exception when insufficient_privilege then null; end $$;
do $$ begin delete from public.contributor; raise exception 'FAILED: phone deleted its contributor row';
exception when insufficient_privilege then null; end $$;
reset role;
update public.contributor set blocked_at = null, blocked_by = null where id = '00000000-0000-0000-0000-0000000000a1';

-- Phone A deletes one of its own: its points and hintos go with it, the rest stay.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
delete from public.contribution where id = '11111111-0000-0000-0000-000000000001';
select pg_temp.check((select count(*) = 2 from public.contribution), 'A has two left');
-- Deleting again is a no-op, not an error: a retried delete is safe.
delete from public.contribution where id = '11111111-0000-0000-0000-000000000001';
reset role;
select pg_temp.check((select count(*) = 0 from public.point_batch where contribution_id = '11111111-0000-0000-0000-000000000001'), 'points went with it');
select pg_temp.check((select count(*) = 0 from public.hinto where contribution_id = '11111111-0000-0000-0000-000000000001'), 'hintos went with it');

-- An editor deletes any upload, with its points and hintos; the phone's others stay.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
delete from public.contribution where id = '22222222-0000-0000-0000-000000000001';
reset role;
select pg_temp.check((select count(*) = 0 from public.contribution where id = '22222222-0000-0000-0000-000000000001'), 'editor deleted it');
select pg_temp.check((select count(*) = 0 from public.point_batch where contribution_id = '22222222-0000-0000-0000-000000000001'), 'its points went with it');
select pg_temp.check((select count(*) = 19 from public.contribution where contributor_id = '00000000-0000-0000-0000-0000000000b1'), 'B''s others stay');
-- A signed-in non-editor who is not the uploader deletes nothing.
insert into auth.users (id, is_anonymous) values ('00000000-0000-0000-0000-0000000000c9', true) on conflict do nothing;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c9', false);
delete from public.contribution;
reset role;
select pg_temp.check((select count(*) = 19 from public.contribution where contributor_id = '00000000-0000-0000-0000-0000000000b1'), 'a stranger deletes nothing');

-- A deleted phone identity takes everything of its own with it.
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.check((select count(*) = 0 from public.contribution where contributor_id = '00000000-0000-0000-0000-0000000000a1'), 'identity delete cascades');
select pg_temp.check((select count(*) = 19 from public.contribution), 'B''s nineteen remain');

-- Definer helpers are out of reach; the save is not a definer.
select pg_temp.check(not has_function_privilege('anon', 'private.can_contribute()', 'execute'), 'anon cannot run can_contribute');
select pg_temp.check(not has_function_privilege('authenticated', 'private.contribution_stamp()', 'execute'), 'stamp not callable');
select pg_temp.check(not has_function_privilege('anon', 'public.save_contribution(jsonb)', 'execute'), 'anon cannot save');
select pg_temp.check((select not prosecdef and proconfig @> array['search_path=""'] from pg_proc where oid = 'public.save_contribution(jsonb)'::regprocedure), 'save is invoker with a pinned path');
select pg_temp.check((select bool_and(relrowsecurity) from pg_class where oid in
  ('public.contributor'::regclass, 'public.contribution'::regclass, 'public.point_batch'::regclass, 'public.hinto'::regclass)), 'row security on');
