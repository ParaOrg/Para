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
create temp table p1 as select payload from draft where id = (select id from d1);
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
create temp table p2 as select payload from draft where id = (select id from d2);
select public.submit_draft((select id from d2), 1);
select pg_temp.check(public.approve_draft((select id from d2)) ->> 'code' = 'approved', 'route approved');
select pg_temp.check((select signboards = '{verify.svg}' and shape is not null from route_variant where id = (select dir_id from ids)), 'direction + signboard written');
select pg_temp.check((select count(*) = 1 from route_stop where route_variant_id = (select dir_id from ids)), 'link written');

-- A missing or wrong links list is refused at claim (nothing stored) and,
-- in a draft row edited after claim, at approve; a wrong value (a cast, a
-- missing row) is refused at approve. Either way the approved links and both
-- revisions stay, and so does the draft.
grant select on p1, p2 to authenticated;
create function pg_temp.links_now() returns text language sql as $$
  select string_agg(route_variant_id || ':' || stop_id || ':' || stop_sequence, ',' order by route_variant_id, stop_id)
  from public.route_stop
  where route_variant_id = (select dir_id from ids) or stop_id = (select stop_id from ids) $$;
create function pg_temp.rejected(k text, pl jsonb, want text, what text, claim_want text default 'bad_payload') returns void language plpgsql as $$
declare
  subj uuid := case k when 'route' then (select route_id from ids) else (select stop_id from ids) end;
  base bigint := case k when 'route' then (select revision from public.route where id = subj)
                        else (select revision from public.stop where id = subj) end;
  before text := pg_temp.links_now();
  rev_before text := (select r.revision || '/' || s.revision from public.route r, public.stop s
                      where r.id = (select route_id from ids) and s.id = (select stop_id from ids));
  did uuid;
  got text;
begin
  got := public.claim_draft(k, subj, false, base, pl) ->> 'code';
  perform pg_temp.check(got = claim_want, what || ': claim answered ' || coalesce(got, 'null'));
  delete from public.draft where subject_id = subj;
  insert into public.draft (kind, subject_id, is_new, status, payload, base_revision)
  values (k, subj, false, 'pending', pl, base) returning id into did;
  got := public.approve_draft(did) ->> 'code';
  perform pg_temp.check(got = want, what || ': approve answered ' || coalesce(got, 'null'));
  perform pg_temp.check(pg_temp.links_now() is not distinct from before, what || ': links changed');
  perform pg_temp.check((select r.revision || '/' || s.revision from public.route r, public.stop s
                         where r.id = (select route_id from ids) and s.id = (select stop_id from ids)) = rev_before,
                        what || ': a revision moved');
  perform pg_temp.check(exists (select 1 from public.draft where id = did), what || ': draft lost');
  delete from public.draft where id = did;
end $$;
select pg_temp.check(pg_temp.links_now() is not null, 'fixture has a link');
select pg_temp.rejected('route', (select payload #- '{directions,0,links}' from p2), 'bad_payload', 'direction without links');
select pg_temp.rejected('route', (select jsonb_set(payload, '{directions,0,links}', 'null') from p2), 'bad_payload', 'direction links null');
select pg_temp.rejected('route', (select jsonb_set(payload, '{directions,0,links}', '{}') from p2), 'bad_payload', 'direction links an object');
select pg_temp.rejected('route', (select jsonb_set(payload, '{directions,0,links}', '"[]"') from p2), 'bad_payload', 'direction links a string');
select pg_temp.rejected('route', (select jsonb_set(payload, '{directions,0,links,0,stop_sequence}', '1.5') from p2), 'bad_payload', 'stop_sequence 1.5');
select pg_temp.rejected('route', (select jsonb_set(payload, '{directions,0,links,0,stop_sequence}', '"1"') from p2), 'bad_payload', 'stop_sequence a string');
select pg_temp.rejected('route', (select jsonb_set(payload, '{directions,0,links,0,stop_id}', '"nope"') from p2), 'bad_payload', 'stop_id not a uuid');
select pg_temp.rejected('route', (select jsonb_set(payload, '{directions,0,links,0}', '"x"') from p2), 'bad_payload', 'link not an object');
select pg_temp.rejected('route', (select jsonb_set(payload, '{directions,0,id}', '7') from p2), 'bad_payload', 'direction id a number');
select pg_temp.rejected('route', (select jsonb_set(payload, '{directions,0,links,0,stop_id}', to_jsonb(gen_random_uuid()::text)) from p2), 'refused', 'link to no hotspot', 'ok');
select pg_temp.rejected('route', (select jsonb_set(payload, '{route,mode}', '"rocket"') from p2), 'bad_payload', 'unknown mode', 'ok');
select pg_temp.rejected('hotspot', (select payload - 'links' from p1), 'bad_payload', 'hotspot without links');
select pg_temp.rejected('hotspot', (select jsonb_set(payload, '{links}', 'null') from p1), 'bad_payload', 'hotspot links null');
select pg_temp.rejected('hotspot', (select jsonb_set(payload, '{links}', '"[]"') from p1), 'bad_payload', 'hotspot links a string');
select pg_temp.rejected('hotspot', (select jsonb_set(payload, '{links}', jsonb_build_array(jsonb_build_object('route_variant_id', (select dir_id from ids), 'stop_sequence', null))) from p1), 'bad_payload', 'hotspot link stop_sequence null');
select pg_temp.rejected('hotspot', (select jsonb_set(payload, '{links}', jsonb_build_array(jsonb_build_object('route_variant_id', gen_random_uuid(), 'stop_sequence', 0))) from p1), 'refused', 'hotspot link to no direction', 'ok');
select pg_temp.rejected('hotspot', (select jsonb_set(payload, '{stop,name}', 'null') from p1), 'bad_payload', 'hotspot without a name', 'ok');

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
