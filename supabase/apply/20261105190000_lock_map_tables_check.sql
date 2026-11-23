-- ParaPo — checks after applying the lock_map_tables migration.
--
-- Two parts. The first adds a test editor, two places and a route, proves the behaviour, and rolls
-- every one of them back: it raises "FAILED: ..." on the first wrong result, and nothing it did
-- remains. It proves that an editor can no longer insert, update or delete route, route_variant,
-- stop or route_stop directly, still reads them, and still changes the map through the draft
-- functions: a new hotspot claimed and published, a route unpublished and published back, a
-- take-down and put-back. The second part is read-only: one row per check, every ok should be t.

-- Part one: the behaviour, rolled back.
begin;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;
grant execute on function pg_temp.check(boolean, text) to authenticated;
-- Runs `statement` as the caller and passes only when it is refused for want of privilege.
create function pg_temp.refused(statement text) returns boolean language plpgsql as $$
begin
  execute statement;
  raise exception 'FAILED: an editor ran directly: %', statement;
exception when insufficient_privilege then return true;
end $$;
grant execute on function pg_temp.refused(text) to authenticated;
create function pg_temp.draft_of(sid uuid) returns public.draft language sql as $$
  select * from public.draft where subject_id = sid;
$$;
grant execute on function pg_temp.draft_of(uuid) to authenticated;

-- Ids start 7e7e7e83 so nothing live shares them.
insert into auth.users (id, is_anonymous) values ('7e7e7e83-0000-0000-0000-0000000000e1', false);
insert into private.editor (user_id) values ('7e7e7e83-0000-0000-0000-0000000000e1');
insert into public.stop (id, owner_id, name, kind, point) values
  ('7e7e7e83-0000-0000-0000-0000000000a1', '7e7e7e83-0000-0000-0000-0000000000e1', 'Lock check T1',
   'terminal', '{"type":"Point","coordinates":[121.25,14.6]}'),
  ('7e7e7e83-0000-0000-0000-0000000000a2', '7e7e7e83-0000-0000-0000-0000000000e1', 'Lock check T2',
   'terminal', '{"type":"Point","coordinates":[121.27,14.6]}');
insert into public.route (id, owner_id, signboard, head_stop_id, tail_stop_id) values
  ('7e7e7e83-0000-0000-0000-0000000000b1', '7e7e7e83-0000-0000-0000-0000000000e1', 'Lock check',
   '7e7e7e83-0000-0000-0000-0000000000a1', '7e7e7e83-0000-0000-0000-0000000000a2');
insert into public.route_variant (id, route_id, owner_id, reversed, shape) values
  ('7e7e7e83-0000-0000-0000-0000000000c1', '7e7e7e83-0000-0000-0000-0000000000b1',
   '7e7e7e83-0000-0000-0000-0000000000e1', false,
   '{"type":"LineString","coordinates":[[121.25,14.6],[121.27,14.6]]}');
insert into public.route_stop (route_variant_id, stop_id, stop_sequence) values
  ('7e7e7e83-0000-0000-0000-0000000000c1', '7e7e7e83-0000-0000-0000-0000000000a1', 0);

set role authenticated;
select set_config('request.jwt.claim.sub', '7e7e7e83-0000-0000-0000-0000000000e1', true);
-- Direct writes, every kind on every table: refused.
select pg_temp.check(pg_temp.refused($$insert into public.stop (owner_id, name, kind, point) values
    ('7e7e7e83-0000-0000-0000-0000000000e1', 'Direct', 'hintuan', '{"type":"Point","coordinates":[121.3,14.6]}')$$),
  'insert into stop');
select pg_temp.check(pg_temp.refused($$update public.stop set note = 'direct' where id = '7e7e7e83-0000-0000-0000-0000000000a1'$$),
  'update stop');
select pg_temp.check(pg_temp.refused($$delete from public.stop where id = '7e7e7e83-0000-0000-0000-0000000000a2'$$),
  'delete stop');
select pg_temp.check(pg_temp.refused($$insert into public.route (owner_id, signboard, is_loop) values
    ('7e7e7e83-0000-0000-0000-0000000000e1', 'Direct', true)$$), 'insert into route');
select pg_temp.check(pg_temp.refused($$update public.route set fare_note = 'direct' where id = '7e7e7e83-0000-0000-0000-0000000000b1'$$),
  'update route');
select pg_temp.check(pg_temp.refused($$delete from public.route where id = '7e7e7e83-0000-0000-0000-0000000000b1'$$),
  'delete route');
select pg_temp.check(pg_temp.refused($$insert into public.route_variant (route_id, owner_id, reversed) values
    ('7e7e7e83-0000-0000-0000-0000000000b1', '7e7e7e83-0000-0000-0000-0000000000e1', true)$$),
  'insert into route_variant');
select pg_temp.check(pg_temp.refused($$update public.route_variant set signboards = '{x.svg}' where id = '7e7e7e83-0000-0000-0000-0000000000c1'$$),
  'update route_variant');
select pg_temp.check(pg_temp.refused($$delete from public.route_variant where id = '7e7e7e83-0000-0000-0000-0000000000c1'$$),
  'delete route_variant');
select pg_temp.check(pg_temp.refused($$insert into public.route_stop (route_variant_id, stop_id, stop_sequence) values
    ('7e7e7e83-0000-0000-0000-0000000000c1', '7e7e7e83-0000-0000-0000-0000000000a2', 1)$$),
  'insert into route_stop');
select pg_temp.check(pg_temp.refused($$update public.route_stop set stop_sequence = 5 where route_variant_id = '7e7e7e83-0000-0000-0000-0000000000c1'$$),
  'update route_stop');
select pg_temp.check(pg_temp.refused($$delete from public.route_stop where route_variant_id = '7e7e7e83-0000-0000-0000-0000000000c1'$$),
  'delete route_stop');
-- Reads stay.
select pg_temp.check((select count(*) = 1 from public.route where id = '7e7e7e83-0000-0000-0000-0000000000b1')
    and (select count(*) = 1 from public.route_stop where route_variant_id = '7e7e7e83-0000-0000-0000-0000000000c1'),
  'an editor still reads the map');
-- The draft functions still change the map.
select public.claim_draft('hotspot', '7e7e7e83-0000-0000-0000-0000000000a3', true, null,
  jsonb_build_object('version', 1, 'stop', jsonb_build_object('name', 'Lock check new', 'informal', null,
    'aliases', '[]'::jsonb, 'kind', 'hintuan', 'note', null, 'line', null,
    'point', '{"type":"Point","coordinates":[121.26,14.61]}'::jsonb, 'area', null), 'links', '[]'::jsonb));
select pg_temp.check(public.publish_draft(d.id, d.revision) ->> 'code' = 'approved', 'a new hotspot is published')
  from pg_temp.draft_of('7e7e7e83-0000-0000-0000-0000000000a3') d;
select pg_temp.check(public.unpublish('route', '7e7e7e83-0000-0000-0000-0000000000b1') ->> 'code' = 'unpublished',
  'a route is unpublished');
select pg_temp.check(public.publish_draft(d.id, d.revision) ->> 'code' = 'approved', 'and published back')
  from pg_temp.draft_of('7e7e7e83-0000-0000-0000-0000000000b1') d;
select pg_temp.check(public.take_down('hotspot', '7e7e7e83-0000-0000-0000-0000000000a3') ->> 'code' = 'taken_down'
    and public.put_back('hotspot', '7e7e7e83-0000-0000-0000-0000000000a3') ->> 'code' = 'put_back',
  'take down and put back still work');
reset role;
select pg_temp.check((select status = 'approved' from public.stop where id = '7e7e7e83-0000-0000-0000-0000000000a3')
    and (select status = 'approved' from public.route where id = '7e7e7e83-0000-0000-0000-0000000000b1'),
  'the map is as the functions left it');

rollback;

-- Part two: read-only.
select * from (values
  (1, 'authenticated writes none of route, route_variant, stop, route_stop',
   (select bool_and(not has_table_privilege('authenticated', t, 'insert')
                    and not has_table_privilege('authenticated', t, 'update')
                    and not has_table_privilege('authenticated', t, 'delete')
                    and not has_any_column_privilege('authenticated', t, 'insert')
                    and not has_any_column_privilege('authenticated', t, 'update'))
      from unnest(array['public.route', 'public.route_variant', 'public.stop', 'public.route_stop']) t)),
  (2, 'authenticated still reads all four',
   (select bool_and(has_table_privilege('authenticated', t, 'select'))
      from unnest(array['public.route', 'public.route_variant', 'public.stop', 'public.route_stop']) t)),
  (3, 'anon writes none of them either',
   (select bool_and(not has_table_privilege('anon', t, 'insert') and not has_table_privilege('anon', t, 'update')
                    and not has_table_privilege('anon', t, 'delete'))
      from unnest(array['public.route', 'public.route_variant', 'public.stop', 'public.route_stop']) t)),
  (4, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'lock_map_tables'))
) as c(n, what, ok) order by n;
