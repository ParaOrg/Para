-- ParaPo — checks after applying the refresh_draft_base_maker migration.
--
-- Two parts. The first adds two test editors and two hotspots with drafts,
-- proves the behaviour, and rolls every one of them back: it raises
-- "FAILED: ..." on the first wrong result, and nothing it did remains. It
-- proves:
--   - another editor's Keep (refresh_draft_base) on a draft with a maker is
--     refused with not_your_draft, with the right revision and with a wrong
--     one (it never says which), and the draft is unchanged: same base
--     revision, revision and payload;
--   - the maker's own Keep still answers ok and moves the draft onto the
--     approved revision;
--   - a draft whose maker's account is gone is kept by any editor.
-- The second part is read-only: one row per check, every ok should be t.

-- Part one: the behaviour, rolled back.
begin;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;
grant execute on function pg_temp.check(boolean, text) to authenticated;
create function pg_temp.payload(sid uuid) returns jsonb language sql as $$
  select jsonb_build_object('version', 1, 'stop', (select to_jsonb(s) from public.stop s where s.id = sid),
    'links', '[]'::jsonb);
$$;
grant execute on function pg_temp.payload(uuid) to authenticated;

-- Ids start 7e7e7e81 so nothing live shares them.
insert into auth.users (id, is_anonymous) values
  ('7e7e7e81-0000-0000-0000-0000000000e1', false), ('7e7e7e81-0000-0000-0000-0000000000e2', false);
insert into private.editor (user_id) values
  ('7e7e7e81-0000-0000-0000-0000000000e1'), ('7e7e7e81-0000-0000-0000-0000000000e2');
insert into public.stop (id, owner_id, name, kind, point) values
  ('7e7e7e81-0000-0000-0000-0000000000a1', '7e7e7e81-0000-0000-0000-0000000000e1',
   'Keep-maker check H1', 'hintuan', '{"type":"Point","coordinates":[121.15,14.6]}'),
  ('7e7e7e81-0000-0000-0000-0000000000a2', '7e7e7e81-0000-0000-0000-0000000000e1',
   'Keep-maker check H2', 'hintuan', '{"type":"Point","coordinates":[121.16,14.6]}');

set role authenticated;
select set_config('request.jwt.claim.sub', '7e7e7e81-0000-0000-0000-0000000000e1', true);
-- e1 makes a draft on each hotspot.
select public.claim_draft('hotspot', s.id, false, s.revision, pg_temp.payload(s.id))
  from public.stop s where s.name like 'Keep-maker check H%';
reset role;
-- H2's maker is gone.
update public.draft set editor_id = null where subject_id = '7e7e7e81-0000-0000-0000-0000000000a2';
create function pg_temp.draft_of(n int) returns uuid language sql as $$
  select id from public.draft where subject_id = ('7e7e7e81-0000-0000-0000-0000000000a' || n)::uuid;
$$;
grant execute on function pg_temp.draft_of(int) to authenticated;
create temp table before_keep as
  select id, base_revision, revision, payload, updated_at from public.draft where subject_id = '7e7e7e81-0000-0000-0000-0000000000a1';
grant select on before_keep to authenticated;

set role authenticated;
-- e2, another editor, on e1's draft: refused, with the right revision and a wrong one.
select set_config('request.jwt.claim.sub', '7e7e7e81-0000-0000-0000-0000000000e2', true);
select pg_temp.check(public.refresh_draft_base(d.id, d.revision, s.revision) ->> 'code' = 'not_your_draft',
  'another editor cannot Keep a draft that has a maker')
  from public.draft d join public.stop s on s.id = d.subject_id where d.id = pg_temp.draft_of(1);
select pg_temp.check(r ->> 'code' = 'not_your_draft' and not (r ? 'current_revision'),
  'a wrong revision is not told to another editor')
  from (select public.refresh_draft_base(pg_temp.draft_of(1), 99, 99) r) x;
select pg_temp.check(
  (select d.base_revision is not distinct from b.base_revision and d.revision = b.revision
          and d.payload = b.payload and d.updated_at = b.updated_at
     from public.draft d join before_keep b on b.id = d.id),
  'the refused Keep changed nothing');

-- The maker's own Keep.
select set_config('request.jwt.claim.sub', '7e7e7e81-0000-0000-0000-0000000000e1', true);
select pg_temp.check(public.refresh_draft_base(d.id, d.revision, s.revision) ->> 'code' = 'ok',
  'the maker keeps their own draft')
  from public.draft d join public.stop s on s.id = d.subject_id where d.id = pg_temp.draft_of(1);

-- A maker-less draft: any editor.
select set_config('request.jwt.claim.sub', '7e7e7e81-0000-0000-0000-0000000000e2', true);
select pg_temp.check(public.refresh_draft_base(d.id, d.revision, s.revision) ->> 'code' = 'ok',
  'any editor keeps a draft whose maker is gone')
  from public.draft d join public.stop s on s.id = d.subject_id where d.id = pg_temp.draft_of(2);
reset role;

rollback;

-- Part two: read-only.
select * from (values
  (1, 'refresh_draft_base answers not_your_draft before it reads the revision or changes anything',
   (select position('not_your_draft' in prosrc) > 0
      and position('not_your_draft' in prosrc) < position('revision_mismatch' in prosrc)
      and position('not_your_draft' in prosrc) < position('update public.draft' in prosrc)
      from pg_proc where oid = 'public.refresh_draft_base(uuid, integer, bigint)'::regprocedure)),
  (2, 'a definer with a pinned path, for authenticated and not anon or PUBLIC',
   (select prosecdef and proconfig @> array['search_path=""']
      and has_function_privilege('authenticated', oid, 'execute')
      and not has_function_privilege('anon', oid, 'execute')
      and not has_function_privilege('public', oid, 'execute')
      from pg_proc where oid = 'public.refresh_draft_base(uuid, integer, bigint)'::regprocedure)),
  (3, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'refresh_draft_base_maker'))
) as c(n, what, ok) order by n;
