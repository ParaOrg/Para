-- ParaPo — checks after applying the drop_inert_write_policies migration.
--
-- Two parts. The first adds a test editor, a test account that is no editor, two places and a
-- route, proves the behaviour, and rolls every one of them back: it raises "FAILED: ..." on the
-- first wrong result, and nothing it did remains. It proves that nobody writes route,
-- route_variant, stop or route_stop directly (anon, a signed-in account, an editor: every kind of
-- write on every table refused), that each still reads what it read, and that the draft functions
-- still change the map. The second part is read-only: one row per check, every ok should be t.

-- Part one: the behaviour, rolled back.
begin;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;
grant execute on function pg_temp.check(boolean, text) to anon, authenticated;
-- Runs `statement` as the caller and passes only when it is refused for want of privilege.
create function pg_temp.refused(statement text) returns boolean language plpgsql as $$
begin
  execute statement;
  raise exception 'FAILED: ran directly: %', statement;
exception when insufficient_privilege then return true;
end $$;
grant execute on function pg_temp.refused(text) to anon, authenticated;
-- Every kind of direct write on every one of the four tables, as the caller: all refused.
create function pg_temp.writes_refused(who text) returns void language plpgsql as $$
declare statement text;
begin
  foreach statement in array array[
    $w$insert into public.stop (owner_id, name, kind, point) values
      ('7e7e7e84-0000-0000-0000-0000000000e1', 'Direct', 'hintuan', '{"type":"Point","coordinates":[121.3,14.6]}')$w$,
    $w$update public.stop set note = 'direct' where id = '7e7e7e84-0000-0000-0000-0000000000a1'$w$,
    $w$delete from public.stop where id = '7e7e7e84-0000-0000-0000-0000000000a2'$w$,
    $w$insert into public.route (owner_id, signboard, is_loop) values
      ('7e7e7e84-0000-0000-0000-0000000000e1', 'Direct', true)$w$,
    $w$update public.route set fare_note = 'direct' where id = '7e7e7e84-0000-0000-0000-0000000000b1'$w$,
    $w$delete from public.route where id = '7e7e7e84-0000-0000-0000-0000000000b1'$w$,
    $w$insert into public.route_variant (route_id, owner_id, reversed) values
      ('7e7e7e84-0000-0000-0000-0000000000b1', '7e7e7e84-0000-0000-0000-0000000000e1', true)$w$,
    $w$update public.route_variant set signboards = '{x.svg}' where id = '7e7e7e84-0000-0000-0000-0000000000c1'$w$,
    $w$delete from public.route_variant where id = '7e7e7e84-0000-0000-0000-0000000000c1'$w$,
    $w$insert into public.route_stop (route_variant_id, stop_id, stop_sequence) values
      ('7e7e7e84-0000-0000-0000-0000000000c1', '7e7e7e84-0000-0000-0000-0000000000a2', 1)$w$,
    $w$update public.route_stop set stop_sequence = 5 where route_variant_id = '7e7e7e84-0000-0000-0000-0000000000c1'$w$,
    $w$delete from public.route_stop where route_variant_id = '7e7e7e84-0000-0000-0000-0000000000c1'$w$
  ] loop
    perform pg_temp.check(pg_temp.refused(statement), who || ': ' || statement);
  end loop;
end $$;
grant execute on function pg_temp.writes_refused(text) to anon, authenticated;
create function pg_temp.draft_of(sid uuid) returns public.draft language sql as $$
  select * from public.draft where subject_id = sid;
$$;
grant execute on function pg_temp.draft_of(uuid) to authenticated;

-- Ids start 7e7e7e84 so nothing live shares them. e1 is an editor, e2 an account that is not.
insert into auth.users (id, is_anonymous) values
  ('7e7e7e84-0000-0000-0000-0000000000e1', false), ('7e7e7e84-0000-0000-0000-0000000000e2', false);
insert into private.editor (user_id) values ('7e7e7e84-0000-0000-0000-0000000000e1');
insert into public.stop (id, owner_id, name, kind, point) values
  ('7e7e7e84-0000-0000-0000-0000000000a1', '7e7e7e84-0000-0000-0000-0000000000e1', 'Policy check T1',
   'terminal', '{"type":"Point","coordinates":[121.25,14.6]}'),
  ('7e7e7e84-0000-0000-0000-0000000000a2', '7e7e7e84-0000-0000-0000-0000000000e1', 'Policy check T2',
   'terminal', '{"type":"Point","coordinates":[121.27,14.6]}');
insert into public.route (id, owner_id, signboard, head_stop_id, tail_stop_id) values
  ('7e7e7e84-0000-0000-0000-0000000000b1', '7e7e7e84-0000-0000-0000-0000000000e1', 'Policy check',
   '7e7e7e84-0000-0000-0000-0000000000a1', '7e7e7e84-0000-0000-0000-0000000000a2');
insert into public.route_variant (id, route_id, owner_id, reversed, shape) values
  ('7e7e7e84-0000-0000-0000-0000000000c1', '7e7e7e84-0000-0000-0000-0000000000b1',
   '7e7e7e84-0000-0000-0000-0000000000e1', false,
   '{"type":"LineString","coordinates":[[121.25,14.6],[121.27,14.6]]}');
insert into public.route_stop (route_variant_id, stop_id, stop_sequence) values
  ('7e7e7e84-0000-0000-0000-0000000000c1', '7e7e7e84-0000-0000-0000-0000000000a1', 0);

-- Without a session: no write, and the approved rows are still read.
set role anon;
select pg_temp.writes_refused('anon');
select pg_temp.check((select count(*) = 1 from public.route where id = '7e7e7e84-0000-0000-0000-0000000000b1')
    and (select count(*) = 1 from public.route_variant where id = '7e7e7e84-0000-0000-0000-0000000000c1')
    and (select count(*) = 2 from public.stop where id::text like '7e7e7e84-%')
    and (select count(*) = 1 from public.route_stop where route_variant_id = '7e7e7e84-0000-0000-0000-0000000000c1'),
  'anon still reads the approved map');
reset role;

-- A signed-in account that is no editor: the same.
set role authenticated;
select set_config('request.jwt.claim.sub', '7e7e7e84-0000-0000-0000-0000000000e2', true);
select pg_temp.writes_refused('an account that is no editor');
select pg_temp.check((select count(*) = 1 from public.route where id = '7e7e7e84-0000-0000-0000-0000000000b1')
    and (select count(*) = 1 from public.route_stop where route_variant_id = '7e7e7e84-0000-0000-0000-0000000000c1'),
  'an account that is no editor still reads the approved map');

-- An editor: no direct write either, the reads stay, and the draft functions still change the map.
select set_config('request.jwt.claim.sub', '7e7e7e84-0000-0000-0000-0000000000e1', true);
select pg_temp.writes_refused('an editor');
select pg_temp.check((select count(*) = 1 from public.route where id = '7e7e7e84-0000-0000-0000-0000000000b1')
    and (select count(*) = 1 from public.route_stop where route_variant_id = '7e7e7e84-0000-0000-0000-0000000000c1'),
  'an editor still reads the map');
select public.claim_draft('hotspot', '7e7e7e84-0000-0000-0000-0000000000a3', true, null,
  jsonb_build_object('version', 1, 'stop', jsonb_build_object('name', 'Policy check new', 'informal', null,
    'aliases', '[]'::jsonb, 'kind', 'hintuan', 'note', null, 'line', null,
    'point', '{"type":"Point","coordinates":[121.26,14.61]}'::jsonb, 'area', null), 'links', '[]'::jsonb));
select pg_temp.check(public.publish_draft(d.id, d.revision) ->> 'code' = 'approved', 'a new hotspot is published')
  from pg_temp.draft_of('7e7e7e84-0000-0000-0000-0000000000a3') d;
select pg_temp.check(public.unpublish('route', '7e7e7e84-0000-0000-0000-0000000000b1') ->> 'code' = 'unpublished',
  'a route is unpublished');
-- The unpublished route is the editor's to read and no longer anyone else's.
select pg_temp.check((select count(*) = 1 from public.route where id = '7e7e7e84-0000-0000-0000-0000000000b1'),
  'an editor reads a route that is not approved');
select set_config('request.jwt.claim.sub', '7e7e7e84-0000-0000-0000-0000000000e2', true);
select pg_temp.check((select count(*) = 0 from public.route where id = '7e7e7e84-0000-0000-0000-0000000000b1'),
  'an account that is no editor does not');
select set_config('request.jwt.claim.sub', '7e7e7e84-0000-0000-0000-0000000000e1', true);
select pg_temp.check(public.publish_draft(d.id, d.revision) ->> 'code' = 'approved', 'and published back')
  from pg_temp.draft_of('7e7e7e84-0000-0000-0000-0000000000b1') d;
select pg_temp.check(public.take_down('hotspot', '7e7e7e84-0000-0000-0000-0000000000a3') ->> 'code' = 'taken_down'
    and public.put_back('hotspot', '7e7e7e84-0000-0000-0000-0000000000a3') ->> 'code' = 'put_back',
  'take down and put back still work');
reset role;
select pg_temp.check((select status = 'approved' from public.stop where id = '7e7e7e84-0000-0000-0000-0000000000a3')
    and (select status = 'approved' from public.route where id = '7e7e7e84-0000-0000-0000-0000000000b1'),
  'the map is as the functions left it');

rollback;

-- Part two: read-only.
select * from (values
  (1, 'route, route_variant, stop and route_stop have read policies only',
   (select count(*) = 0 from pg_policies
      where schemaname = 'public' and tablename in ('route', 'route_variant', 'stop', 'route_stop')
        and cmd <> 'SELECT')),
  (2, 'each keeps its two read policies, and takedown its two',
   (select count(*) = 10 from pg_policies
      where schemaname = 'public' and cmd = 'SELECT'
        and policyname in ('route_read_approved', 'route_read_editor', 'route_variant_read_approved',
          'route_variant_read_editor', 'stop_read_approved', 'stop_read_editor', 'route_stop_read_approved',
          'route_stop_read_editor', 'takedown_read_editor', 'takedown_read_public'))),
  (3, 'row level security is on for all four',
   (select bool_and(relrowsecurity) from pg_class
      where oid in ('public.route'::regclass, 'public.route_variant'::regclass, 'public.stop'::regclass,
        'public.route_stop'::regclass))),
  (4, 'anon and authenticated write none of them',
   (select bool_and(not has_table_privilege(r, t, 'insert') and not has_table_privilege(r, t, 'update')
                    and not has_table_privilege(r, t, 'delete'))
      from unnest(array['public.route', 'public.route_variant', 'public.stop', 'public.route_stop']) t,
           unnest(array['anon', 'authenticated']) r)),
  (5, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'drop_inert_write_policies'))
) as c(n, what, ok) order by n;
