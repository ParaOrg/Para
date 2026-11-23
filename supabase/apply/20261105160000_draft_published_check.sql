-- ParaPo — checks after applying the draft_published migration.
--
-- Two parts. The first adds two test editors, a non-editor, three places and
-- a route, proves the behaviour, and rolls every one of them back: it raises
-- "FAILED: ..." on the first wrong result, and nothing it did remains. It
-- proves:
--   - save_draft saves the maker's draft at the revision read, out of review,
--     naming who saved it; refuses another editor's draft, a stale revision
--     and a malformed payload; the direct update the studio on main makes
--     still works and names its saver too;
--   - publish_draft refuses a stale revision, then publishes: the route as
--     the draft has it, approved, its published and last-saved columns
--     written (published_by the draft's maker), the draft gone; a draft whose
--     route changed since it was based answers conflict and changes nothing;
--     a new hotspot is published the same way;
--   - unpublish takes a route down and leaves a draft of it as it stands,
--     held by the unpublisher, carrying the route's last save, which
--     publishing puts back unchanged; an existing draft is kept and rebased;
--     a hotspot that ends a published route is refused (blocked) and left
--     as it was; a second unpublish is not_published;
--   - the studio on main's submit_draft and approve_reviewed_draft still
--     publish, and stamp the same columns;
--   - a non-editor can call none of them.
-- The second part is read-only: one row per check, every ok should be t.

-- Part one: the behaviour, rolled back.
begin;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;
grant execute on function pg_temp.check(boolean, text) to authenticated;
create function pg_temp.draft_of(sid uuid) returns public.draft language sql as $$
  select * from public.draft where subject_id = sid;
$$;
grant execute on function pg_temp.draft_of(uuid) to authenticated;
-- The payload as the studio would build it now (private.payload_of is never granted).
create function pg_temp.payload(k text, sid uuid) returns jsonb language sql security definer as $$
  select private.payload_of(k, sid);
$$;
grant execute on function pg_temp.payload(text, uuid) to authenticated;

-- Ids start 7e7e7e80 so nothing live shares them. e1 and e2 edit; n1 does not.
insert into auth.users (id, is_anonymous) values
  ('7e7e7e80-0000-0000-0000-0000000000e1', false), ('7e7e7e80-0000-0000-0000-0000000000e2', false),
  ('7e7e7e80-0000-0000-0000-0000000000f1', false);
insert into private.editor (user_id) values
  ('7e7e7e80-0000-0000-0000-0000000000e1'), ('7e7e7e80-0000-0000-0000-0000000000e2');
insert into public.stop (id, owner_id, name, kind, point, area) values
  ('7e7e7e80-0000-0000-0000-0000000000a1', '7e7e7e80-0000-0000-0000-0000000000e1',
   'Published check T1', 'terminal', '{"type":"Point","coordinates":[121.15,14.6]}', null),
  ('7e7e7e80-0000-0000-0000-0000000000a2', '7e7e7e80-0000-0000-0000-0000000000e1',
   'Published check T2', 'terminal', '{"type":"Point","coordinates":[121.17,14.6]}', null),
  ('7e7e7e80-0000-0000-0000-0000000000a3', '7e7e7e80-0000-0000-0000-0000000000e1',
   'Published check H', 'hintuan', '{"type":"Point","coordinates":[121.16,14.6]}',
   '{"type":"Polygon","coordinates":[[[121.159,14.599],[121.161,14.599],[121.161,14.601],[121.159,14.601],[121.159,14.599]]]}');
insert into public.route (id, owner_id, signboard, head_stop_id, tail_stop_id) values
  ('7e7e7e80-0000-0000-0000-0000000000b1', '7e7e7e80-0000-0000-0000-0000000000e1', 'Published check',
   '7e7e7e80-0000-0000-0000-0000000000a1', '7e7e7e80-0000-0000-0000-0000000000a2');
insert into public.route_variant (id, route_id, owner_id, reversed, shape, signboards) values
  ('7e7e7e80-0000-0000-0000-0000000000c1', '7e7e7e80-0000-0000-0000-0000000000b1',
   '7e7e7e80-0000-0000-0000-0000000000e1', false,
   '{"type":"LineString","coordinates":[[121.15,14.6],[121.17,14.6]]}', '{a.svg}');
insert into public.route_stop (route_variant_id, stop_id, stop_sequence) values
  ('7e7e7e80-0000-0000-0000-0000000000c1', '7e7e7e80-0000-0000-0000-0000000000a3', 1);

set role authenticated;

-- save_draft: e1's draft of the route, with a fare note.
select set_config('request.jwt.claim.sub', '7e7e7e80-0000-0000-0000-0000000000e1', true);
select pg_temp.check(public.claim_draft('route', '7e7e7e80-0000-0000-0000-0000000000b1', false,
    (select revision from public.route where id = '7e7e7e80-0000-0000-0000-0000000000b1'),
    pg_temp.payload('route', '7e7e7e80-0000-0000-0000-0000000000b1')) ->> 'code' = 'ok',
  'e1 claims a draft of the route');
select pg_temp.check((pg_temp.draft_of('7e7e7e80-0000-0000-0000-0000000000b1')).last_saved_by
    = '7e7e7e80-0000-0000-0000-0000000000e1', 'a claimed draft names its maker as its last saver');
select pg_temp.check(public.save_draft(d.id, d.revision - 1,
    jsonb_set(d.payload, '{route,fare_note}', '"Check fare"')) ->> 'code' = 'revision_mismatch',
  'a save at a stale revision is refused')
  from pg_temp.draft_of('7e7e7e80-0000-0000-0000-0000000000b1') d;
select pg_temp.check(public.save_draft(d.id, d.revision, '{"version": 2}') ->> 'code' = 'bad_payload',
  'a malformed payload is refused')
  from pg_temp.draft_of('7e7e7e80-0000-0000-0000-0000000000b1') d;
select set_config('request.jwt.claim.sub', '7e7e7e80-0000-0000-0000-0000000000e2', true);
select pg_temp.check(public.save_draft(d.id, d.revision,
    jsonb_set(d.payload, '{route,fare_note}', '"Not mine"')) ->> 'code' = 'not_your_draft',
  'another editor cannot save over e1''s draft')
  from pg_temp.draft_of('7e7e7e80-0000-0000-0000-0000000000b1') d;
select set_config('request.jwt.claim.sub', '7e7e7e80-0000-0000-0000-0000000000e1', true);
select pg_temp.check(public.save_draft(d.id, d.revision,
    jsonb_set(d.payload, '{route,fare_note}', '"Check fare"')) ->> 'code' = 'ok', 'the maker saves')
  from pg_temp.draft_of('7e7e7e80-0000-0000-0000-0000000000b1') d;
select pg_temp.check(d.payload -> 'route' ->> 'fare_note' = 'Check fare' and d.status = 'draft'
    and d.revision = 2 and d.last_saved_by = '7e7e7e80-0000-0000-0000-0000000000e1',
  'the save is stored, out of review, at the next revision, naming its saver')
  from pg_temp.draft_of('7e7e7e80-0000-0000-0000-0000000000b1') d;
-- The studio on main updates a draft directly: still allowed, and it names its saver.
reset role;
update public.draft set last_saved_by = null where subject_id = '7e7e7e80-0000-0000-0000-0000000000b1';
set role authenticated;
with u as (update public.draft set payload = jsonb_set(payload, '{route,note_check}', '"direct"')
    where subject_id = '7e7e7e80-0000-0000-0000-0000000000b1' returning last_saved_by)
select pg_temp.check((select count(*) = 1 and bool_and(last_saved_by = '7e7e7e80-0000-0000-0000-0000000000e1') from u),
  'a direct update of the payload still works, and names its saver');

-- publish_draft: stale, then published by e2; the maker is named.
select set_config('request.jwt.claim.sub', '7e7e7e80-0000-0000-0000-0000000000e2', true);
select pg_temp.check(public.publish_draft(d.id, d.revision - 1) ->> 'code' = 'revision_mismatch',
  'a publish at a stale revision is refused')
  from pg_temp.draft_of('7e7e7e80-0000-0000-0000-0000000000b1') d;
select pg_temp.check(public.publish_draft(d.id, d.revision) ->> 'code' = 'approved', 'the draft is published')
  from pg_temp.draft_of('7e7e7e80-0000-0000-0000-0000000000b1') d;
reset role;
select pg_temp.check(r.fare_note = 'Check fare' and r.status = 'approved'
    and r.published_at = now() and r.published_by = '7e7e7e80-0000-0000-0000-0000000000e1'
    and r.last_saved_by = '7e7e7e80-0000-0000-0000-0000000000e1' and r.last_saved_at is not null
    and not exists (select 1 from public.draft where subject_id = r.id)
    and exists (select 1 from public.route_stop where route_variant_id = '7e7e7e80-0000-0000-0000-0000000000c1'),
  'the route is as the draft had it, approved, stamped with its maker and last save; the draft is gone')
  from public.route r where r.id = '7e7e7e80-0000-0000-0000-0000000000b1';
set role authenticated;

-- A draft whose route changed since it was based: conflict, nothing changed.
select set_config('request.jwt.claim.sub', '7e7e7e80-0000-0000-0000-0000000000e1', true);
select public.claim_draft('route', '7e7e7e80-0000-0000-0000-0000000000b1', false,
  (select revision from public.route where id = '7e7e7e80-0000-0000-0000-0000000000b1'),
  jsonb_set(pg_temp.payload('route', '7e7e7e80-0000-0000-0000-0000000000b1'), '{route,fare_note}', '"Stale"'));
reset role;
update public.route set via = 'Live edit' where id = '7e7e7e80-0000-0000-0000-0000000000b1';
set role authenticated;
select pg_temp.check(public.publish_draft(d.id, d.revision) ->> 'code' = 'conflict', 'a stale base is a conflict')
  from pg_temp.draft_of('7e7e7e80-0000-0000-0000-0000000000b1') d;
select pg_temp.check(r.via = 'Live edit' and r.fare_note = 'Check fare'
    and exists (select 1 from public.draft where subject_id = r.id), 'the conflict changed neither the route nor the draft')
  from public.route r where r.id = '7e7e7e80-0000-0000-0000-0000000000b1';
select public.discard_draft(d.id) from pg_temp.draft_of('7e7e7e80-0000-0000-0000-0000000000b1') d;

-- unpublish: down, and a draft of the route as it stands, held by e2, carrying e1's last save.
select set_config('request.jwt.claim.sub', '7e7e7e80-0000-0000-0000-0000000000e2', true);
select pg_temp.check(public.unpublish('route', '7e7e7e80-0000-0000-0000-0000000000b1') ->> 'code' = 'unpublished',
  'the route is unpublished');
reset role;
select pg_temp.check(r.status = 'taken_down' and d.editor_id = '7e7e7e80-0000-0000-0000-0000000000e2'
    and d.last_saved_by = r.last_saved_by and d.updated_at = r.last_saved_at
    and d.base_revision = r.revision and not d.is_new and d.status = 'draft'
    and d.payload = private.payload_of('route', r.id)
    and exists (select 1 from public.takedown t where t.subject_id = r.id and t.put_back_at is null),
  'down and logged, with a draft of it as it stands, based on its revision, carrying its last save')
  from public.route r, pg_temp.draft_of('7e7e7e80-0000-0000-0000-0000000000b1') d
  where r.id = '7e7e7e80-0000-0000-0000-0000000000b1';
set role authenticated;
select pg_temp.check(public.unpublish('route', '7e7e7e80-0000-0000-0000-0000000000b1') ->> 'code' = 'not_published',
  'a second unpublish is not_published');
select pg_temp.check(public.publish_draft(d.id, d.revision) ->> 'code' = 'approved', 'publishing it puts it back')
  from pg_temp.draft_of('7e7e7e80-0000-0000-0000-0000000000b1') d;
reset role;
select pg_temp.check(r.status = 'approved' and r.fare_note = 'Check fare' and r.via = 'Live edit'
    and r.published_by = '7e7e7e80-0000-0000-0000-0000000000e2'
    and not exists (select 1 from public.takedown t where t.subject_id = r.id and t.put_back_at is null),
  'back unchanged, published by the draft''s maker, and the takedown closed')
  from public.route r where r.id = '7e7e7e80-0000-0000-0000-0000000000b1';
set role authenticated;

-- An existing draft is kept and rebased: e1's next change survives e2's unpublish.
select set_config('request.jwt.claim.sub', '7e7e7e80-0000-0000-0000-0000000000e1', true);
select public.claim_draft('route', '7e7e7e80-0000-0000-0000-0000000000b1', false,
  (select revision from public.route where id = '7e7e7e80-0000-0000-0000-0000000000b1'),
  jsonb_set(pg_temp.payload('route', '7e7e7e80-0000-0000-0000-0000000000b1'), '{route,fare_note}', '"Next"'));
select set_config('request.jwt.claim.sub', '7e7e7e80-0000-0000-0000-0000000000e2', true);
select pg_temp.check(public.unpublish('route', '7e7e7e80-0000-0000-0000-0000000000b1') ->> 'code' = 'unpublished',
  'unpublished with a draft already there');
select pg_temp.check(d.editor_id = '7e7e7e80-0000-0000-0000-0000000000e1'
    and d.payload -> 'route' ->> 'fare_note' = 'Next'
    and d.base_revision = (select revision from public.route where id = d.subject_id),
  'the existing draft is kept, rebased onto the taken-down revision')
  from pg_temp.draft_of('7e7e7e80-0000-0000-0000-0000000000b1') d;
select set_config('request.jwt.claim.sub', '7e7e7e80-0000-0000-0000-0000000000e1', true);
select pg_temp.check(public.publish_draft(d.id, d.revision) ->> 'code' = 'approved', 'and it publishes')
  from pg_temp.draft_of('7e7e7e80-0000-0000-0000-0000000000b1') d;
select pg_temp.check((select fare_note = 'Next' and status = 'approved' from public.route
    where id = '7e7e7e80-0000-0000-0000-0000000000b1'), 'with its change, back on the map');

-- Hotspots: an end of a published route is refused; a hintuan is unpublished.
select pg_temp.check(public.unpublish('hotspot', '7e7e7e80-0000-0000-0000-0000000000a1') ->> 'code' = 'blocked',
  'a hotspot that ends a published route cannot be unpublished');
select pg_temp.check((select status = 'approved' from public.stop where id = '7e7e7e80-0000-0000-0000-0000000000a1')
    and not exists (select 1 from public.draft where subject_id = '7e7e7e80-0000-0000-0000-0000000000a1'), 'and is left as it was, with no draft');
select pg_temp.check(public.unpublish('hotspot', '7e7e7e80-0000-0000-0000-0000000000a3') ->> 'code' = 'unpublished',
  'a hintuan is unpublished');
reset role;
select pg_temp.check(s.status = 'taken_down' and d.payload = private.payload_of('hotspot', s.id)
    and jsonb_array_length(d.payload -> 'links') = 1, 'down, with a draft of it and its link')
  from public.stop s, pg_temp.draft_of('7e7e7e80-0000-0000-0000-0000000000a3') d
  where s.id = '7e7e7e80-0000-0000-0000-0000000000a3';
set role authenticated;

-- A new hotspot is published the same way.
select public.claim_draft('hotspot', '7e7e7e80-0000-0000-0000-0000000000a4', true, null,
  jsonb_build_object('version', 1, 'stop', jsonb_build_object('name', 'Published check new', 'informal', null,
    'aliases', '[]'::jsonb, 'kind', 'hintuan', 'note', null, 'line', null,
    'point', '{"type":"Point","coordinates":[121.2,14.6]}'::jsonb, 'area', null), 'links', '[]'::jsonb));
select pg_temp.check(public.publish_draft(d.id, d.revision) ->> 'code' = 'approved', 'a new hotspot is published')
  from pg_temp.draft_of('7e7e7e80-0000-0000-0000-0000000000a4') d;
reset role;
select pg_temp.check(s.status = 'approved' and s.published_by = '7e7e7e80-0000-0000-0000-0000000000e1'
    and s.last_saved_by = '7e7e7e80-0000-0000-0000-0000000000e1' and s.published_at = now(),
  'stamped with its maker')
  from public.stop s where s.id = '7e7e7e80-0000-0000-0000-0000000000a4';
set role authenticated;

-- The studio on main's path: submit, then approve the submitted revision; the same stamps.
select public.claim_draft('hotspot', '7e7e7e80-0000-0000-0000-0000000000a5', true, null,
  jsonb_build_object('version', 1, 'stop', jsonb_build_object('name', 'Published check old path', 'informal', null,
    'aliases', '[]'::jsonb, 'kind', 'hintuan', 'note', null, 'line', null,
    'point', '{"type":"Point","coordinates":[121.21,14.6]}'::jsonb, 'area', null), 'links', '[]'::jsonb));
select pg_temp.check(public.approve_reviewed_draft(d.id, (public.submit_draft(d.id, d.revision) -> 'draft' ->> 'revision')::integer)
    ->> 'code' = 'approved', 'submit and approve still publish')
  from pg_temp.draft_of('7e7e7e80-0000-0000-0000-0000000000a5') d;
reset role;
select pg_temp.check(s.status = 'approved' and s.published_at = now()
    and s.published_by = '7e7e7e80-0000-0000-0000-0000000000e1'
    and s.last_saved_by = '7e7e7e80-0000-0000-0000-0000000000e1', 'and stamp the same columns')
  from public.stop s where s.id = '7e7e7e80-0000-0000-0000-0000000000a5';
set role authenticated;

-- A non-editor can call none of them.
select set_config('request.jwt.claim.sub', '7e7e7e80-0000-0000-0000-0000000000f1', true);
do $$ begin
  perform public.unpublish('route', '7e7e7e80-0000-0000-0000-0000000000b1');
  raise exception 'FAILED: a non-editor unpublished';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.publish_draft('7e7e7e80-0000-0000-0000-000000000000', 1);
  raise exception 'FAILED: a non-editor published';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.save_draft('7e7e7e80-0000-0000-0000-000000000000', 1, '{"version": 1}');
  raise exception 'FAILED: a non-editor saved';
exception when insufficient_privilege then null; end $$;
reset role;

rollback;

-- Part two: read-only.
select * from (values
  (1, 'route and stop have published_at, published_by, last_saved_at and last_saved_by',
   (select count(*) = 8 from information_schema.columns where table_schema = 'public'
      and table_name in ('route', 'stop')
      and column_name in ('published_at', 'published_by', 'last_saved_at', 'last_saved_by'))),
  (2, 'every row has a last save, and every published one a publish date and who',
   (select not exists (select 1 from public.route where last_saved_at is null
                         or (status = 'approved' and (published_at is null)))
       and not exists (select 1 from public.stop where last_saved_at is null
                         or (status = 'approved' and (published_at is null))))),
  (3, 'save_draft, publish_draft and unpublish: editors'' (authenticated), not anon''s',
   (select bool_and(has_function_privilege('authenticated', f, 'execute')
                    and not has_function_privilege('anon', f, 'execute'))
      from unnest(array['public.save_draft(uuid, integer, jsonb)', 'public.publish_draft(uuid, integer)',
                        'public.unpublish(text, uuid)']) f)),
  (4, 'private.apply_draft and private.payload_of are granted to nobody',
   (select not has_function_privilege('authenticated', 'private.apply_draft(uuid)', 'execute')
       and not has_function_privilege('authenticated', 'private.payload_of(text, uuid)', 'execute'))),
  (5, 'the studio on main keeps approve_draft, approve_reviewed_draft, submit_draft and send_back_draft',
   (select bool_and(has_function_privilege('authenticated', f, 'execute'))
      from unnest(array['public.approve_draft(uuid)', 'public.approve_reviewed_draft(uuid, integer)',
                        'public.submit_draft(uuid, integer)', 'public.send_back_draft(uuid, integer, text)']) f)),
  (6, 'and its direct update of a draft, which draft_saver stamps',
   (select has_column_privilege('authenticated', 'public.draft', 'payload', 'update')
       and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'draft'
                     and policyname = 'draft_update')
       and exists (select 1 from pg_trigger where tgname = 'draft_saver'
                     and tgrelid = 'public.draft'::regclass and not tgisinternal))),
  (7, 'draft.last_saved_by defaults to the caller',
   (select column_default like '%uid()%' from information_schema.columns
      where table_schema = 'public' and table_name = 'draft' and column_name = 'last_saved_by')),
  (8, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'draft_published'))
) as c(n, what, ok) order by n;
