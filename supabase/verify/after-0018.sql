-- Assertions on 0018. Every block raises on a wrong result; run with
-- ON_ERROR_STOP so the first failure stops the run.
\set e1 '''{"sub":"00000000-0000-0000-0000-0000000000e1"}'''
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;

-- Existing rows stay approved and public.
select pg_temp.check((select bool_and(status = 'approved' and revision = 1) from route), 'routes approved');
select pg_temp.check((select bool_and(status = 'approved' and updated_at is not null) from stop), 'stops approved');

-- What anon may read.
set role anon;
select pg_temp.check((select count(*) = 2 from route), 'anon sees approved routes');
select pg_temp.check((select count(*) = 1 from route_stop), 'anon sees links');
select pg_temp.check((select count(*) = 0 from takedown), 'anon reads takedown columns');
do $$ begin perform editor_id from takedown; raise exception 'FAILED: anon read takedown.editor_id';
exception when insufficient_privilege then null; end $$;
do $$ begin perform 1 from draft; raise exception 'FAILED: anon read draft';
exception when insufficient_privilege then null; end $$;
do $$ begin perform 1 from editor_name; raise exception 'FAILED: anon read editor_name';
exception when insufficient_privilege then null; end $$;
do $$ begin update route set status = 'taken_down'; if found then raise exception 'FAILED: anon wrote'; end if;
exception when insufficient_privilege then null; end $$;
reset role;

-- An editor takes a route down: logged, hidden from anon with its directions
-- and links, still seen by the editor.
set role authenticated;
select set_config('request.jwt.claims', :e1, false);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
update route set status = 'taken_down' where id = '20000000-0000-0000-0000-000000000001';
select pg_temp.check((select count(*) = 1 from route where status = 'taken_down'), 'editor sees taken-down route');
select pg_temp.check((select count(*) = 2 from route_variant), 'editor sees its direction');
select pg_temp.check((select editor_id = '00000000-0000-0000-0000-0000000000e1' and put_back_at is null from takedown), 'takedown logged with editor');
reset role;
select pg_temp.check((select status_at > created_at and revision = 2 from route where id = '20000000-0000-0000-0000-000000000001'), 'status_at and revision moved');
set role anon;
select pg_temp.check((select count(*) = 1 from route), 'anon: route hidden');
select pg_temp.check((select count(*) = 1 from route_variant), 'anon: direction hidden');
select pg_temp.check((select count(*) = 0 from route_stop), 'anon: link hidden');
select pg_temp.check((select count(*) = 1 from takedown), 'anon sees the takedown');
reset role;

-- A non-editor signed in (an anonymous contributor later) reads as anon does.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
select pg_temp.check((select count(*) = 1 from route), 'non-editor: approved only');
select pg_temp.check((select count(*) = 0 from draft), 'non-editor: no drafts');
do $$ begin insert into draft (kind, subject_id, is_new, payload) values ('route', gen_random_uuid(), true, '{"version":1}');
raise exception 'FAILED: non-editor wrote a draft'; exception when insufficient_privilege then null; end $$;
select pg_temp.check((select count(*) = 0 from takedown), 'non-editor: no takedown rows');
reset role;

-- Uniqueness reads approved rows: a new A–B, then putting the old one back clashes.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
insert into route (id, signboard, head_stop_id, tail_stop_id) values
  ('20000000-0000-0000-0000-000000000002', 'A–B new', '10000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000b');
do $$ begin update route set status = 'approved' where id = '20000000-0000-0000-0000-000000000001';
raise exception 'FAILED: put back over a new route'; exception when unique_violation then null; end $$;
-- Loops: same rule.
do $$ begin insert into route (signboard, is_loop) values (' ikot ', true);
raise exception 'FAILED: second approved loop'; exception when unique_violation then null; end $$;
update route set status = 'taken_down' where id = '20000000-0000-0000-0000-0000000000c1';
insert into route (id, signboard, is_loop) values ('20000000-0000-0000-0000-0000000000c2', 'Ikot', true);
-- loop_one_way still sees a (taken-down) loop for an editor.
do $$ begin insert into route_variant (route_id, reversed) values ('20000000-0000-0000-0000-0000000000c1', true);
raise exception 'FAILED: way back on a loop'; exception when check_violation then null; end $$;
-- Terminals: same rule.
update stop set status = 'taken_down' where id = '10000000-0000-0000-0000-0000000000f1';
insert into stop (id, name, point, kind) values ('10000000-0000-0000-0000-0000000000f2', 'Cubao', '{"type":"Point","coordinates":[121.06,14.60]}', 'terminal');
do $$ begin update stop set status = 'approved' where id = '10000000-0000-0000-0000-0000000000f1';
raise exception 'FAILED: terminal put back over a new one'; exception when unique_violation then null; end $$;

-- Guards.
update stop set status = 'taken_down' where id = '10000000-0000-0000-0000-00000000000c';
do $$ begin update stop set status = 'taken_down' where id = '10000000-0000-0000-0000-00000000000a';
raise exception 'FAILED: took down an end of an approved route'; exception when check_violation then null; end $$;
do $$ begin insert into route (signboard, head_stop_id, tail_stop_id) values ('A–C', '10000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000c');
raise exception 'FAILED: approved route to a taken-down end'; exception when check_violation then null; end $$;
insert into route (id, signboard, head_stop_id, tail_stop_id, status) values
  ('20000000-0000-0000-0000-000000000003', 'A–C', '10000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000c', 'taken_down');
do $$ begin update route set status = 'approved' where id = '20000000-0000-0000-0000-000000000003';
raise exception 'FAILED: approved with a taken-down end'; exception when check_violation then null; end $$;
do $$ begin update route set tail_stop_id = '10000000-0000-0000-0000-00000000000c' where id = '20000000-0000-0000-0000-000000000002';
raise exception 'FAILED: moved an approved route onto a taken-down end'; exception when check_violation then null; end $$;
-- A taken-down end's link is hidden even on an approved route.
insert into route_variant (id, route_id) values ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002');
insert into route_stop (route_variant_id, stop_id, stop_sequence) values
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-00000000000a', 1),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-00000000000c', 2);
reset role;
set role anon;
select pg_temp.check((select count(*) = 1 from route_stop), 'anon: link to taken-down hotspot hidden');
reset role;

-- Put back closes the takedown row.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
update stop set status = 'approved' where id = '10000000-0000-0000-0000-00000000000c';
select pg_temp.check((select put_back_at is not null and put_back_by = '00000000-0000-0000-0000-0000000000e1' from takedown where subject_id = '10000000-0000-0000-0000-00000000000c'), 'put back logged');

-- Revision counts a direction's changes.
reset role;
select revision as r0 from route where id = '20000000-0000-0000-0000-000000000002' \gset
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
update route_variant set shape = '{"type":"LineString","coordinates":[[121,14.6],[121.01,14.6]]}' where id = '30000000-0000-0000-0000-000000000002';
update route_variant set signboards = array['X'] where id = '30000000-0000-0000-0000-000000000002';
update route set fare_note = 'x' where id = '20000000-0000-0000-0000-000000000002';
delete from route_stop where route_variant_id = '30000000-0000-0000-0000-000000000002';
delete from route_variant where id = '30000000-0000-0000-0000-000000000002';
update route set revision = 1 where id = '20000000-0000-0000-0000-000000000002';
reset role;
select pg_temp.check((select revision = :r0 + 5 from route where id = '20000000-0000-0000-0000-000000000002'), 'revision counts directions, never goes back');

-- An Ikot: approved with no ends, public with its direction, its direction counted.
select revision as l0 from route where id = '20000000-0000-0000-0000-0000000000c2' \gset
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
insert into route_variant (id, route_id) values ('30000000-0000-0000-0000-0000000000c2', '20000000-0000-0000-0000-0000000000c2');
reset role;
select pg_temp.check((select revision = :l0 + 1 and status = 'approved' from route where id = '20000000-0000-0000-0000-0000000000c2'), 'loop approved, its direction counted');
set role anon;
select pg_temp.check((select count(*) = 1 from route where is_loop), 'anon sees the approved loop only');
select pg_temp.check((select count(*) = 1 from route_variant v join route r on r.id = v.route_id where r.is_loop), 'anon sees its direction only');
reset role;

-- Drafts.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
insert into draft (kind, subject_id, is_new, payload, base_revision) values
  ('route', '20000000-0000-0000-0000-000000000002', false, '{"version":1}', 5);
do $$ begin insert into draft (kind, subject_id, is_new, payload, base_revision) values ('route', '20000000-0000-0000-0000-000000000002', false, '{"version":1}', 5);
raise exception 'FAILED: two drafts of one route'; exception when unique_violation then null; end $$;
do $$ begin insert into draft (kind, subject_id, is_new, payload) values ('route', gen_random_uuid(), false, '{"version":1}');
raise exception 'FAILED: edit draft without a base'; exception when check_violation then null; end $$;
do $$ begin insert into draft (kind, subject_id, is_new, payload) values ('route', gen_random_uuid(), true, '{"line":[]}');
raise exception 'FAILED: unversioned payload'; exception when check_violation then null; end $$;
do $$ begin insert into draft (kind, subject_id, is_new, payload, editor_id) values ('route', gen_random_uuid(), true, '{"version":1}', '00000000-0000-0000-0000-0000000000a2');
raise exception 'FAILED: draft in another name'; exception when insufficient_privilege then null; end $$;
update draft set status = 'pending', submitted_at = now();
select pg_temp.check((select revision = 2 and editor_id = '00000000-0000-0000-0000-0000000000e1' from draft), 'draft revision');
select pg_temp.check((select count(*) = 0 from editor_name), 'editor reads names');
reset role;
\echo 'after-0018: all checks passed'
