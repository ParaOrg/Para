-- ParaPo — checks after applying the review_rules migration.
--
-- Two parts. The first adds two test editors, test routes and hotspots and
-- their drafts, proves the behaviour, and rolls every one of them back: it
-- raises "FAILED: ..." on the first wrong result, and nothing it did remains.
-- It proves:
--   - approving a route whose links are unchanged moves no hotspot's revision
--     and no other route's; approving a hotspot whose links are unchanged
--     moves no route's;
--   - a changed link is written: a dropped one deleted, a new one inserted, a
--     new sequence stored, and only the hotspots they touch move;
--   - a hotspot listed twice is still refused, and nothing is written;
--   - Keep (refresh_draft_base) on a hintuan draft takes the links the
--     approved directions have now, so a route approved meanwhile through
--     it is kept on approval; a hintuan draft that moves the outline keeps
--     its own list; a terminal draft keeps the editor's ticked links only,
--     plus the ikot that pass it now;
--   - an editor updates a draft's payload, status, submitted_at and note,
--     and is refused base_revision, editor_id, subject_id, kind and is_new;
--     a direct update cannot leave a draft without its maker;
--   - another editor cannot update, delete or discard someone's draft
--     (not_your_draft), and the maker can;
--   - a draft whose maker is gone is discarded by any editor;
--   - anon changes no draft.
-- The second part is read-only: one row per check, every ok should be t.

-- Part one: the behaviour, rolled back.
begin;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;
grant execute on function pg_temp.check(boolean, text) to anon, authenticated;

-- An approved route's or hotspot's whole payload, as the studio would save it unchanged.
create function pg_temp.route_payload(rid uuid) returns jsonb language sql as $$
  select jsonb_build_object('version', 1, 'route', (select to_jsonb(r) from public.route r where r.id = rid),
    'directions', coalesce((select jsonb_agg(to_jsonb(v) || jsonb_build_object('links',
        coalesce((select jsonb_agg(jsonb_build_object('stop_id', l.stop_id, 'stop_sequence', l.stop_sequence)
                                   order by l.stop_id)
                  from public.route_stop l where l.route_variant_id = v.id), '[]'::jsonb)) order by v.id)
      from public.route_variant v where v.route_id = rid), '[]'::jsonb));
$$;
create function pg_temp.hotspot_payload(sid uuid) returns jsonb language sql as $$
  select jsonb_build_object('version', 1, 'stop', (select to_jsonb(s) from public.stop s where s.id = sid),
    'links', coalesce((select jsonb_agg(jsonb_build_object('route_variant_id', l.route_variant_id,
                                                            'stop_sequence', l.stop_sequence)
                                         order by l.route_variant_id)
      from public.route_stop l where l.stop_id = sid), '[]'::jsonb));
$$;
-- A link set, comparable: "direction:hotspot:sequence" sorted.
create function pg_temp.links_of(sid uuid) returns text language sql as $$
  select coalesce(string_agg(route_variant_id || ':' || stop_sequence, ',' order by route_variant_id), '')
  from public.route_stop where stop_id = sid;
$$;
create function pg_temp.payload_links(p jsonb) returns text language sql as $$
  select coalesce(string_agg((l ->> 'route_variant_id') || ':' || (l ->> 'stop_sequence'), ','
                             order by l ->> 'route_variant_id'), '')
  from jsonb_array_elements(p -> 'links') l;
$$;
create function pg_temp.rev(sid uuid) returns bigint language sql as $$
  select coalesce((select revision from public.stop where id = sid), (select revision from public.route where id = sid));
$$;
grant execute on all functions in schema pg_temp to authenticated;

-- Two editors and the ground they edit. Ids start 7e7e7e7e so nothing live shares them.
insert into auth.users (id, is_anonymous) values
  ('7e7e7e7e-0000-0000-0000-0000000000e1', false), ('7e7e7e7e-0000-0000-0000-0000000000e2', false);
insert into private.editor (user_id) values
  ('7e7e7e7e-0000-0000-0000-0000000000e1'), ('7e7e7e7e-0000-0000-0000-0000000000e2');
create temp table k (name text primary key, id uuid not null);
grant select on k to authenticated;
insert into k values
  ('e1', '7e7e7e7e-0000-0000-0000-0000000000e1'), ('e2', '7e7e7e7e-0000-0000-0000-0000000000e2'),
  ('t1', '7e7e7e7e-0000-0000-0000-0000000000a1'), ('t2', '7e7e7e7e-0000-0000-0000-0000000000a2'),
  ('h', '7e7e7e7e-0000-0000-0000-0000000000a3'), ('h2', '7e7e7e7e-0000-0000-0000-0000000000a4'),
  ('r', '7e7e7e7e-0000-0000-0000-0000000000b1'), ('r2', '7e7e7e7e-0000-0000-0000-0000000000b2'),
  ('loop', '7e7e7e7e-0000-0000-0000-0000000000b3'),
  ('v', '7e7e7e7e-0000-0000-0000-0000000000c1'), ('v2', '7e7e7e7e-0000-0000-0000-0000000000c2'),
  ('vl', '7e7e7e7e-0000-0000-0000-0000000000c3');
create function pg_temp.k(n text) returns uuid language sql as $$ select id from k where name = n $$;
grant execute on function pg_temp.k(text) to authenticated;

insert into public.stop (id, owner_id, name, kind, point, area) values
  (pg_temp.k('t1'), pg_temp.k('e1'), 'Review rules check T1', 'terminal', '{"type":"Point","coordinates":[121.1,14.6]}', null),
  (pg_temp.k('t2'), pg_temp.k('e1'), 'Review rules check T2', 'terminal', '{"type":"Point","coordinates":[121.2,14.6]}', null),
  (pg_temp.k('h'), pg_temp.k('e1'), 'Review rules check H', 'hintuan', '{"type":"Point","coordinates":[121.15,14.6]}',
   '{"type":"Polygon","coordinates":[[[121.149,14.599],[121.151,14.599],[121.151,14.601],[121.149,14.599]]]}'),
  (pg_temp.k('h2'), pg_temp.k('e1'), 'Review rules check H2', 'hintuan', '{"type":"Point","coordinates":[121.17,14.6]}', null);
insert into public.route (id, owner_id, signboard, head_stop_id, tail_stop_id, via, is_loop) values
  (pg_temp.k('r'), pg_temp.k('e1'), 'Review rules check', pg_temp.k('t1'), pg_temp.k('t2'), null, false),
  (pg_temp.k('r2'), pg_temp.k('e1'), 'Review rules check 2', pg_temp.k('t1'), pg_temp.k('t2'), 'Review rules check via', false),
  (pg_temp.k('loop'), pg_temp.k('e1'), 'Review rules check ikot', null, null, null, true);
insert into public.route_variant (id, route_id, owner_id, direction_name, reversed, shape) values
  (pg_temp.k('v'), pg_temp.k('r'), pg_temp.k('e1'), 'Review rules check', false,
   '{"type":"LineString","coordinates":[[121.1,14.6],[121.2,14.6]]}'),
  (pg_temp.k('v2'), pg_temp.k('r2'), pg_temp.k('e1'), 'Review rules check 2', false,
   '{"type":"LineString","coordinates":[[121.1,14.6],[121.2,14.6]]}'),
  (pg_temp.k('vl'), pg_temp.k('loop'), pg_temp.k('e1'), 'Review rules check ikot', false,
   '{"type":"LineString","coordinates":[[121.1,14.6],[121.12,14.61],[121.1,14.6]]}');
insert into public.route_stop (route_variant_id, stop_id, stop_sequence) values
  (pg_temp.k('v'), pg_temp.k('t1'), 0), (pg_temp.k('v'), pg_temp.k('h'), 3), (pg_temp.k('v'), pg_temp.k('t2'), 9),
  (pg_temp.k('v2'), pg_temp.k('t1'), 0), (pg_temp.k('v2'), pg_temp.k('h'), 4), (pg_temp.k('v2'), pg_temp.k('t2'), 9),
  (pg_temp.k('vl'), pg_temp.k('t1'), 1);
create temp table seen (name text primary key, revision bigint);
grant select, insert, update, delete on seen to authenticated;
create function pg_temp.remember() returns void language sql as $$
  delete from seen;
  insert into seen select name, pg_temp.rev(id) from k where name in ('t1', 't2', 'h', 'h2', 'r', 'r2', 'loop');
$$;
create function pg_temp.moved() returns text language sql as $$
  select coalesce(string_agg(s.name, ',' order by s.name), '') from seen s
  where s.revision <> pg_temp.rev(pg_temp.k(s.name));
$$;
grant execute on all functions in schema pg_temp to authenticated;

-- anon changes no draft.
set role anon;
do $$ begin
  update public.draft set note = 'anon' where false;
  raise exception 'FAILED: anon may update drafts';
exception when insufficient_privilege then null; end $$;
do $$ begin
  delete from public.draft where false;
  raise exception 'FAILED: anon may delete drafts';
exception when insufficient_privilege then null; end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e7e7e7e-0000-0000-0000-0000000000e1', true);

-- 1. A route approval whose links are unchanged moves no neighbour.
select pg_temp.remember();
create temp table d (name text primary key, id uuid, revision integer);
select public.claim_draft('route', pg_temp.k('r'), false, pg_temp.rev(pg_temp.k('r')),
  jsonb_set(pg_temp.route_payload(pg_temp.k('r')), '{route,fare_note}', '"Fare checked"'));
insert into d select 'route', id, revision from public.draft where subject_id = pg_temp.k('r');
select pg_temp.check(public.submit_draft(id, revision) ->> 'code' = 'submitted', 'submit the unchanged-links route draft')
  from d where name = 'route';
select pg_temp.check(public.approve_draft(id) ->> 'code' = 'approved', 'approve the unchanged-links route draft')
  from d where name = 'route';
select pg_temp.check((select fare_note = 'Fare checked' from public.route where id = pg_temp.k('r')),
  'the approved route has its new fare note');
select pg_temp.check(pg_temp.moved() = 'r', 'only the route moved, no hotspot or other route: ' || pg_temp.moved());
select pg_temp.check(pg_temp.links_of(pg_temp.k('h')) = pg_temp.k('v') || ':3,' || pg_temp.k('v2') || ':4',
  'the links stayed as they were');

-- 2. A hotspot approval whose links are unchanged moves no route.
select pg_temp.remember();
select public.claim_draft('hotspot', pg_temp.k('h'), false, pg_temp.rev(pg_temp.k('h')),
  jsonb_set(pg_temp.hotspot_payload(pg_temp.k('h')), '{stop,note}', '"Under the footbridge"'));
select pg_temp.check(public.submit_draft(id, revision) ->> 'code' = 'submitted', 'submit the unchanged-links hotspot draft')
  from public.draft where subject_id = pg_temp.k('h');
select pg_temp.check(public.approve_draft(id) ->> 'code' = 'approved', 'approve the unchanged-links hotspot draft')
  from public.draft where subject_id = pg_temp.k('h');
select pg_temp.check(pg_temp.moved() = 'h', 'only the hotspot moved, no route: ' || pg_temp.moved());

-- 3. A changed link is written, and only the hotspots it touches move.
select pg_temp.remember();
select public.claim_draft('route', pg_temp.k('r'), false, pg_temp.rev(pg_temp.k('r')),
  jsonb_set(pg_temp.route_payload(pg_temp.k('r')), '{directions,0,links}', jsonb_build_array(
    jsonb_build_object('stop_id', pg_temp.k('t1'), 'stop_sequence', 0),
    jsonb_build_object('stop_id', pg_temp.k('h2'), 'stop_sequence', 5),
    jsonb_build_object('stop_id', pg_temp.k('t2'), 'stop_sequence', 8))));
select public.submit_draft(id, revision) from public.draft where subject_id = pg_temp.k('r');
select pg_temp.check(public.approve_draft(id) ->> 'code' = 'approved', 'approve the changed-links route draft')
  from public.draft where subject_id = pg_temp.k('r');
select pg_temp.check(pg_temp.moved() = 'h,h2,r,t2',
  'the dropped (h), added (h2) and resequenced (t2) hotspots moved, t1 did not: ' || pg_temp.moved());
select pg_temp.check((select string_agg(stop_id || ':' || stop_sequence, ',' order by stop_sequence)
    from public.route_stop where route_variant_id = pg_temp.k('v'))
  = pg_temp.k('t1') || ':0,' || pg_temp.k('h2') || ':5,' || pg_temp.k('t2') || ':8',
  'the direction has exactly the payload''s links');

-- 4. A hotspot listed twice is refused, and nothing is written.
select pg_temp.remember();
select public.claim_draft('route', pg_temp.k('r'), false, pg_temp.rev(pg_temp.k('r')),
  jsonb_set(jsonb_set(pg_temp.route_payload(pg_temp.k('r')), '{route,fare_note}', '"Twice"'),
    '{directions,0,links}', jsonb_build_array(
    jsonb_build_object('stop_id', pg_temp.k('t1'), 'stop_sequence', 0),
    jsonb_build_object('stop_id', pg_temp.k('h'), 'stop_sequence', 4),
    jsonb_build_object('stop_id', pg_temp.k('h'), 'stop_sequence', 6))));
select public.submit_draft(id, revision) from public.draft where subject_id = pg_temp.k('r');
select pg_temp.check(public.approve_draft(id) ->> 'code' = 'refused', 'a hotspot listed twice is refused')
  from public.draft where subject_id = pg_temp.k('r');
select pg_temp.check(pg_temp.moved() = '' and (select fare_note = 'Fare checked' from public.route where id = pg_temp.k('r')),
  'the refused approval wrote nothing: ' || pg_temp.moved());
select public.discard_draft(id) from public.draft where subject_id = pg_temp.k('r');

-- 5. Keep rebuilds a hintuan draft's links from the approved directions.
--    e1 drafts h while only v2 passes it; e2 approves r passing h again.
select public.claim_draft('hotspot', pg_temp.k('h'), false, pg_temp.rev(pg_temp.k('h')),
  jsonb_set(pg_temp.hotspot_payload(pg_temp.k('h')), '{stop,note}', '"Kept after a conflict"'));
select pg_temp.check(pg_temp.payload_links(payload) = pg_temp.k('v2') || ':4', 'the hintuan draft holds v2 only')
  from public.draft where subject_id = pg_temp.k('h');
select set_config('request.jwt.claim.sub', '7e7e7e7e-0000-0000-0000-0000000000e2', true);
select public.claim_draft('route', pg_temp.k('r'), false, pg_temp.rev(pg_temp.k('r')),
  jsonb_set(pg_temp.route_payload(pg_temp.k('r')), '{directions,0,links}',
    pg_temp.route_payload(pg_temp.k('r')) #> '{directions,0,links}'
      || jsonb_build_array(jsonb_build_object('stop_id', pg_temp.k('h'), 'stop_sequence', 2))));
select public.submit_draft(id, revision) from public.draft where subject_id = pg_temp.k('r');
select pg_temp.check(public.approve_draft(id) ->> 'code' = 'approved', 'e2 approves r through h')
  from public.draft where subject_id = pg_temp.k('r');
select set_config('request.jwt.claim.sub', '7e7e7e7e-0000-0000-0000-0000000000e1', true);
select public.submit_draft(id, revision) from public.draft where subject_id = pg_temp.k('h');
select pg_temp.check(public.approve_draft(id) ->> 'code' = 'conflict', 'the hintuan draft now conflicts')
  from public.draft where subject_id = pg_temp.k('h');
select pg_temp.check(public.refresh_draft_base(id, revision, pg_temp.rev(pg_temp.k('h'))) ->> 'code' = 'ok', 'Keep')
  from public.draft where subject_id = pg_temp.k('h');
select pg_temp.check(pg_temp.payload_links(payload) = pg_temp.k('v') || ':2,' || pg_temp.k('v2') || ':4'
    and payload -> 'stop' ->> 'note' = 'Kept after a conflict' and status = 'draft',
  'Keep took the approved directions'' links and kept the draft''s own changes: ' || pg_temp.payload_links(payload))
  from public.draft where subject_id = pg_temp.k('h');
select public.submit_draft(id, revision) from public.draft where subject_id = pg_temp.k('h');
select pg_temp.check(public.approve_draft(id) ->> 'code' = 'approved', 'approve the kept hintuan draft')
  from public.draft where subject_id = pg_temp.k('h');
select pg_temp.check(pg_temp.links_of(pg_temp.k('h')) = pg_temp.k('v') || ':2,' || pg_temp.k('v2') || ':4',
  'the route approved meanwhile still passes the hintuan');

-- 6. A hintuan draft that moves the outline keeps its own list on Keep.
select public.claim_draft('hotspot', pg_temp.k('h'), false, pg_temp.rev(pg_temp.k('h')),
  jsonb_set(jsonb_set(pg_temp.hotspot_payload(pg_temp.k('h')), '{stop,area}',
    '{"type":"Polygon","coordinates":[[[121.159,14.599],[121.161,14.599],[121.161,14.601],[121.159,14.599]]]}'),
    '{links}', jsonb_build_array(jsonb_build_object('route_variant_id', pg_temp.k('v2'), 'stop_sequence', 7))));
reset role;
update public.stop set note = 'Approved meanwhile' where id = pg_temp.k('h');
set role authenticated;
select pg_temp.check(public.refresh_draft_base(id, revision, pg_temp.rev(pg_temp.k('h'))) ->> 'code' = 'ok', 'Keep a moved outline')
  from public.draft where subject_id = pg_temp.k('h');
select pg_temp.check(pg_temp.payload_links(payload) = pg_temp.k('v2') || ':7',
  'a moved outline keeps the draft''s own links: ' || pg_temp.payload_links(payload))
  from public.draft where subject_id = pg_temp.k('h');
select public.discard_draft(id) from public.draft where subject_id = pg_temp.k('h');

-- 7. A terminal draft keeps the ticked links only, plus the ikot passing it now.
--    t1 is passed by v, v2 and the ikot vl; the editor ticked v alone, and the
--    draft's ikot link is stale (sequence 6, approved 1).
select public.claim_draft('hotspot', pg_temp.k('t1'), false, pg_temp.rev(pg_temp.k('t1')),
  jsonb_set(jsonb_set(pg_temp.hotspot_payload(pg_temp.k('t1')), '{stop,note}', '"Ticked"'), '{links}', jsonb_build_array(
    jsonb_build_object('route_variant_id', pg_temp.k('v'), 'stop_sequence', 0),
    jsonb_build_object('route_variant_id', pg_temp.k('vl'), 'stop_sequence', 6))));
reset role;
update public.stop set note = 'Approved meanwhile' where id = pg_temp.k('t1');
set role authenticated;
select pg_temp.check(public.refresh_draft_base(id, revision, pg_temp.rev(pg_temp.k('t1'))) ->> 'code' = 'ok', 'Keep a terminal')
  from public.draft where subject_id = pg_temp.k('t1');
select pg_temp.check(pg_temp.payload_links(payload) = pg_temp.k('v') || ':0,' || pg_temp.k('vl') || ':1',
  'the ticked link stays, the unticked v2 stays out, the ikot''s is the approved one: ' || pg_temp.payload_links(payload))
  from public.draft where subject_id = pg_temp.k('t1');

-- 8. Only the content columns, and only the maker's draft.
--    The terminal draft above is e1's.
select pg_temp.check((select count(*) = 1 from public.draft where subject_id = pg_temp.k('t1')), 'e1 has a draft');
with u as (update public.draft set payload = jsonb_set(payload, '{stop,note}', '"Edited"'), status = 'draft',
    submitted_at = null, note = 'A note' where subject_id = pg_temp.k('t1') returning 1)
select pg_temp.check((select count(*) = 1 from u), 'the maker updates payload, status, submitted_at and note');
do $$
declare col text;
begin
  foreach col in array array['base_revision', 'editor_id', 'subject_id', 'kind', 'is_new', 'revision', 'created_at'] loop
    begin
      execute format('update public.draft set %I = %I where subject_id = %L', col, col, pg_temp.k('t1'));
      raise exception 'FAILED: the maker updated draft.%', col;
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;
select set_config('request.jwt.claim.sub', '7e7e7e7e-0000-0000-0000-0000000000e2', true);
with u as (update public.draft set note = 'Not mine' where subject_id = pg_temp.k('t1') returning 1)
select pg_temp.check((select count(*) = 0 from u), 'another editor updates no one else''s draft');
with x as (delete from public.draft where subject_id = pg_temp.k('t1') returning 1)
select pg_temp.check((select count(*) = 0 from x), 'another editor deletes no one else''s draft');
select pg_temp.check(public.discard_draft(id) ->> 'code' = 'not_your_draft', 'another editor cannot discard it')
  from public.draft where subject_id = pg_temp.k('t1');
select pg_temp.check(public.discard_draft(id, revision) ->> 'code' = 'not_your_draft',
  'nor with its revision') from public.draft where subject_id = pg_temp.k('t1');
select pg_temp.check((select count(*) = 1 from public.draft where subject_id = pg_temp.k('t1')), 'the draft is still there');
select set_config('request.jwt.claim.sub', '7e7e7e7e-0000-0000-0000-0000000000e1', true);
select pg_temp.check(public.discard_draft(id, revision - 1) ->> 'code' = 'revision_mismatch', 'the maker''s stale discard')
  from public.draft where subject_id = pg_temp.k('t1');
select pg_temp.check(public.discard_draft(id, revision) ->> 'code' = 'discarded', 'the maker discards it')
  from public.draft where subject_id = pg_temp.k('t1');
select public.claim_draft('hotspot', pg_temp.k('t2'), false, pg_temp.rev(pg_temp.k('t2')), pg_temp.hotspot_payload(pg_temp.k('t2')));
with x as (delete from public.draft where subject_id = pg_temp.k('t2') returning 1)
select pg_temp.check((select count(*) = 1 from x), 'the maker deletes their own draft directly');

-- 9. A draft whose maker is gone: any editor discards it; a direct update
--    cannot keep it maker-less, and a direct delete is the maker's only.
select public.claim_draft('hotspot', pg_temp.k('h2'), false, pg_temp.rev(pg_temp.k('h2')), pg_temp.hotspot_payload(pg_temp.k('h2')));
reset role;
update public.draft set editor_id = null where subject_id = pg_temp.k('h2');
set role authenticated;
select set_config('request.jwt.claim.sub', '7e7e7e7e-0000-0000-0000-0000000000e2', true);
do $$ begin
  update public.draft set note = 'Orphan' where subject_id = pg_temp.k('h2');
  raise exception 'FAILED: a direct update left a draft without its maker';
exception when insufficient_privilege then null; end $$;
with x as (delete from public.draft where subject_id = pg_temp.k('h2') returning 1)
select pg_temp.check((select count(*) = 0 from x), 'a maker-less draft is not deleted directly');
select pg_temp.check(public.discard_draft(id) ->> 'code' = 'discarded', 'any editor discards a maker-less draft')
  from public.draft where subject_id = pg_temp.k('h2');
select pg_temp.check((select count(*) = 0 from public.draft where subject_id = pg_temp.k('h2')), 'it is gone');
reset role;

rollback;

-- Part two: read-only.
select * from (values
  (1, 'authenticated updates draft.payload, status, submitted_at and note, and no other column',
   (select not has_table_privilege('authenticated', 'public.draft', 'update')
      and bool_and(has_column_privilege('authenticated', 'public.draft', a.attname, 'update')
                   = (a.attname in ('payload', 'status', 'submitted_at', 'note')))
      from pg_attribute a where a.attrelid = 'public.draft'::regclass and a.attnum > 0 and not a.attisdropped)),
  (2, 'anon updates and deletes no draft',
   (select not has_table_privilege('anon', 'public.draft', 'update')
      and not has_table_privilege('anon', 'public.draft', 'delete')
      and not has_any_column_privilege('anon', 'public.draft', 'update'))),
  (3, 'draft_update: the maker or a maker-less draft, and the row must stay the maker''s',
   (select qual like '%editor_id%' and qual like '%IS NULL%' and with_check like '%editor_id%'
           and with_check like '%uid%' and with_check not like '%IS NULL%'
      from pg_policies where schemaname = 'public' and tablename = 'draft' and policyname = 'draft_update'
        and cmd = 'UPDATE' and roles = '{authenticated}')),
  (4, 'draft_delete: the maker only',
   (select qual like '%editor_id%' and qual like '%uid%' and qual not like '%IS NULL%'
      from pg_policies where schemaname = 'public' and tablename = 'draft' and policyname = 'draft_delete'
        and cmd = 'DELETE' and roles = '{authenticated}')),
  (5, 'discard_draft answers not_your_draft before it deletes',
   (select position('not_your_draft' in prosrc) > 0
      and position('not_your_draft' in prosrc) < position('delete from public.draft' in prosrc)
      from pg_proc where oid = 'public.discard_draft(uuid, integer)'::regprocedure)),
  (6, 'approve_draft writes only the links that differ',
   (select prosrc like '%not exists%route_stop%' and prosrc not like '%delete from public.route_stop where stop_id = d.subject_id;%'
      from pg_proc where oid = 'public.approve_draft(uuid)'::regprocedure)),
  (7, 'refresh_draft_base rebuilds a hotspot draft''s links',
   (select prosrc like '%jsonb_set(p, ''{links}''%'
      from pg_proc where oid = 'public.refresh_draft_base(uuid, integer, bigint)'::regprocedure)),
  (8, 'the three are definers with a pinned path, for authenticated and not anon or PUBLIC',
   (select bool_and(prosecdef and proconfig @> array['search_path=""']
      and has_function_privilege('authenticated', oid, 'execute')
      and not has_function_privilege('anon', oid, 'execute')
      and not has_function_privilege('public', oid, 'execute'))
      from pg_proc where oid in ('public.approve_draft(uuid)'::regprocedure,
        'public.discard_draft(uuid, integer)'::regprocedure,
        'public.refresh_draft_base(uuid, integer, bigint)'::regprocedure))),
  (9, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'review_rules'))
) as c(n, what, ok) order by n;
