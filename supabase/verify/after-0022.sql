-- Assertions on 0022 (the review operations). Runs after after-0018.sql on
-- the same database; every block raises on a wrong result.
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;

-- anon and a signed-in non-editor cannot call them.
set role anon;
do $$ begin perform public.approve_draft(gen_random_uuid()); raise exception 'FAILED: anon ran approve_draft';
exception when insufficient_privilege then null; end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
do $$ begin perform public.take_down('route', gen_random_uuid()); raise exception 'FAILED: non-editor ran take_down';
exception when insufficient_privilege then null; end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);

-- A malformed payload is refused at claim.
select pg_temp.check(public.claim_draft('route', gen_random_uuid(), true, null,
  '{"version":1.5,"route":{},"directions":[]}') ->> 'code' = 'bad_payload', 'claim refuses version 1.5');

-- New hotspot: claim, submit, approve, retry.
create temp table ids as select
  gen_random_uuid() as stop_id, gen_random_uuid() as route_id,
  gen_random_uuid() as dir_id, gen_random_uuid() as empty_id;
grant select on ids to authenticated;
select pg_temp.check(public.claim_draft('hotspot', (select stop_id from ids), true, null,
  jsonb_build_object('version', 1,
    'stop', jsonb_build_object('name', 'Verify Terminal', 'informal', null, 'aliases', '["VT"]'::jsonb,
      'kind', 'terminal', 'note', null, 'area', null, 'line', null,
      'point', '{"type":"Point","coordinates":[121.2,14.7]}'::jsonb),
    'links', '[]'::jsonb)) ->> 'code' = 'ok', 'hotspot draft claimed');
select pg_temp.check((select count(*) = 0 from stop where id = (select stop_id from ids)), 'draft leaves stop table unchanged');
select pg_temp.check(public.submit_draft((select id from draft where subject_id = (select stop_id from ids)), 1) ->> 'code' = 'submitted', 'hotspot submitted');
create temp table d1 as select id from draft where subject_id = (select stop_id from ids);
select pg_temp.check(public.approve_draft((select id from d1)) ->> 'code' = 'approved', 'hotspot approved');
select pg_temp.check((select status = 'approved' and aliases = '{VT}' from stop where id = (select stop_id from ids)), 'hotspot row written');
select pg_temp.check(public.approve_draft((select id from d1)) ->> 'code' = 'no_draft', 'retry answers no_draft');

-- New loop route with one drawn direction, linked to that hotspot.
select pg_temp.check(public.claim_draft('route', (select route_id from ids), true, null,
  jsonb_build_object('version', 1,
    'route', jsonb_build_object('signboard', 'Verify Loop', 'mode', 'jeepney', 'fare_note', null, 'via', null,
      'head_stop_id', null, 'tail_stop_id', null, 'is_loop', true),
    'directions', jsonb_build_array(jsonb_build_object(
      'id', (select dir_id from ids), 'reversed', false, 'control_points', '[]'::jsonb, 'segments', '[]'::jsonb,
      'shape', '{"type":"LineString","coordinates":[[121.2,14.7],[121.3,14.8]]}'::jsonb, 'overview', null,
      'signboards', '["verify.svg"]'::jsonb, 'confidence', 'drawn',
      'links', jsonb_build_array(jsonb_build_object('stop_id', (select stop_id from ids), 'stop_sequence', 0)))))
  ) ->> 'code' = 'ok', 'route draft claimed');
select pg_temp.check((select count(*) = 0 from route where id = (select route_id from ids)), 'draft leaves route table unchanged');
create temp table d2 as select id from draft where subject_id = (select route_id from ids);
select public.submit_draft((select id from d2), 1);
select pg_temp.check(public.approve_draft((select id from d2)) ->> 'code' = 'approved', 'route approved');
select pg_temp.check((select signboards = '{verify.svg}' and shape is not null from route_variant where id = (select dir_id from ids)), 'direction + signboard written');
select pg_temp.check((select count(*) = 1 from route_stop where route_variant_id = (select dir_id from ids)), 'link written');

-- Edit draft, then a concurrent link change: approval refuses, nothing moves.
create temp table base as select revision from route where id = (select route_id from ids);
select public.claim_draft('route', (select route_id from ids), false, (select revision from base),
  jsonb_build_object('version', 1,
    'route', jsonb_build_object('signboard', 'Verify Loop', 'mode', 'tricycle', 'fare_note', null, 'via', null,
      'head_stop_id', null, 'tail_stop_id', null, 'is_loop', true),
    'directions', jsonb_build_array(jsonb_build_object(
      'id', (select dir_id from ids), 'reversed', false, 'control_points', '[]'::jsonb, 'segments', '[]'::jsonb,
      'shape', null, 'overview', null, 'signboards', '[]'::jsonb, 'confidence', 'drawn', 'links', '[]'::jsonb))));
create temp table d3 as select id from draft where subject_id = (select route_id from ids);
select public.submit_draft((select id from d3), 1);
update route_stop set stop_sequence = 5 where route_variant_id = (select dir_id from ids);
select pg_temp.check(public.approve_draft((select id from d3)) ->> 'code' = 'conflict', 'link change after drafting is a conflict');
select pg_temp.check((select mode = 'jeepney' and status = 'approved' from route where id = (select route_id from ids)), 'conflict leaves the route unchanged');
select pg_temp.check((select status = 'pending' from draft where id = (select id from d3)), 'conflict keeps the draft');

-- Stale revision on send-back / discard.
select pg_temp.check(public.send_back_draft((select id from d3), 1, 'x') ->> 'code' = 'revision_mismatch', 'send-back on a stale revision');
select pg_temp.check(public.discard_draft((select id from d3), 1) ->> 'code' = 'revision_mismatch', 'discard on a stale revision');

-- Rebase and approve: every direction emptied takes the route down, logged.
select pg_temp.check(public.send_back_draft((select id from d3), (select revision from draft where id = (select id from d3)), 'rebase') ->> 'code' = 'sent_back', 'sent back');
update draft set base_revision = (select revision from route where id = (select route_id from ids)) where id = (select id from d3);
select public.submit_draft((select id from d3), (select revision from draft where id = (select id from d3)));
select pg_temp.check(public.approve_draft((select id from d3)) ->> 'code' = 'approved', 'rebased draft approved');
select pg_temp.check((select status = 'taken_down' from route where id = (select route_id from ids)), 'all directions emptied: route taken down');
select pg_temp.check((select count(*) = 0 from route_stop where route_variant_id = (select dir_id from ids)), 'emptied direction lost its links');
select pg_temp.check((select count(*) = 1 from takedown where subject_id = (select route_id from ids) and put_back_at is null), 'takedown logged');

-- Put back, take down again.
select pg_temp.check(public.put_back('route', (select route_id from ids)) ->> 'code' = 'put_back', 'put back');
select pg_temp.check(public.put_back('route', (select route_id from ids)) ->> 'code' = 'not_taken_down', 'put back twice');
select pg_temp.check(public.take_down('route', (select route_id from ids)) ->> 'code' = 'taken_down', 'taken down');
select pg_temp.check(public.take_down('route', (select route_id from ids)) ->> 'code' = 'not_approved', 'taken down twice');
reset role;
