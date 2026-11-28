-- ParaPo — checks after applying the discard_stale_draft migration.
--
-- Two parts. The first adds two test editors and hotspots with drafts, proves
-- the behaviour, and rolls every one of them back: it raises "FAILED: ..." on
-- the first wrong result, and nothing it did remains. It proves:
--   - another editor's draft changed less than 7 days ago is refused with
--     draft_too_recent and the time it can be discarded from, and is not
--     deleted, even when the caller names the right revision;
--   - at exactly 7 days, and past it, another editor discards it, and a
--     stale revision is still refused after that (revision_mismatch);
--   - the maker discards their own draft at any age, fresh or old;
--   - a maker-less draft is discarded by any editor, fresh or old;
--   - a draft made just now with an old updated_at (unpublish) is fresh, and a
--     stamp in the future counts as now, never for more than 7 days;
--   - a draft made just now with an old updated_at (unpublish) is fresh, and a
--     stamp in the future counts as now, never for more than 7 days;
--   - a save moves the 7 days: a draft old enough to discard is fresh again
--     once its maker saves it.
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

-- Ids start 7e7e7e80 so nothing live shares them.
insert into auth.users (id, is_anonymous) values
  ('7e7e7e80-0000-0000-0000-0000000000e1', false), ('7e7e7e80-0000-0000-0000-0000000000e2', false);
insert into private.editor (user_id) values
  ('7e7e7e80-0000-0000-0000-0000000000e1'), ('7e7e7e80-0000-0000-0000-0000000000e2');
insert into public.stop (id, owner_id, name, kind, point)
select ('7e7e7e80-0000-0000-0000-0000000000a' || n)::uuid, '7e7e7e80-0000-0000-0000-0000000000e1',
       'Stale-draft check H' || n, 'hintuan',
       jsonb_build_object('type', 'Point', 'coordinates', jsonb_build_array(121.1 + n * 0.01, 14.6))
from generate_series(1, 7) n;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e7e7e80-0000-0000-0000-0000000000e1', true);
-- e1 makes a draft on each of the seven hotspots.
select public.claim_draft('hotspot', s.id, false, s.revision, pg_temp.payload(s.id))
  from public.stop s where s.name like 'Stale-draft check H%';
reset role;

-- The draft_revision trigger sets updated_at on every update; switched off here
-- (rolled back with the rest) so a draft can be given an age.
alter table public.draft disable trigger draft_revision;
create function pg_temp.age(n int, days interval) returns void language sql as $$
  update public.draft set updated_at = now() - days, created_at = now() - days
  where subject_id = ('7e7e7e80-0000-0000-0000-0000000000a' || n)::uuid;
$$;
-- H1: 1 day. H2: 6 days 23 h. H3: exactly 7 days. H4: 30 days. H5: 30 days, maker gone.
select pg_temp.age(1, interval '1 day'), pg_temp.age(2, interval '6 days 23 hours'),
       pg_temp.age(3, interval '7 days'), pg_temp.age(4, interval '30 days'),
       pg_temp.age(5, interval '30 days');
update public.draft set editor_id = null where subject_id = '7e7e7e80-0000-0000-0000-0000000000a5';
-- H6: updated_at 30 days old but created just now (what unpublishing leaves): fresh.
select pg_temp.age(6, interval '30 days');
update public.draft set created_at = now() where subject_id = '7e7e7e80-0000-0000-0000-0000000000a6';
-- H7: both stamps in the future (a direct insert): counts as changed now, never beyond 7 days.
select pg_temp.age(7, interval '-30 days');
create function pg_temp.draft_of(n int) returns uuid language sql as $$
  select id from public.draft where subject_id = ('7e7e7e80-0000-0000-0000-0000000000a' || n)::uuid;
$$;
grant execute on function pg_temp.draft_of(int) to authenticated;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e7e7e80-0000-0000-0000-0000000000e2', true);

-- e2, another editor: too fresh at 1 day and at 6 days 23 h, and nothing is deleted.
select pg_temp.check(r ->> 'code' = 'draft_too_recent'
    and (r ->> 'discardable_from')::timestamptz > now() + interval '5 days 23 hours'
    and (r ->> 'discardable_from')::timestamptz <= now() + interval '6 days',
  'a 1-day-old draft of another editor is refused, with the time it can go from')
  from (select public.discard_draft(pg_temp.draft_of(1)) r) x;
select pg_temp.check(public.discard_draft(pg_temp.draft_of(1),
    (select revision from public.draft where id = pg_temp.draft_of(1))) ->> 'code' = 'draft_too_recent',
  'naming the right revision does not get past it');
select pg_temp.check(public.discard_draft(pg_temp.draft_of(2)) ->> 'code' = 'draft_too_recent',
  'at 6 days 23 hours it is still refused');
select pg_temp.check((select count(*) = 2 from public.draft
    where id in (pg_temp.draft_of(1), pg_temp.draft_of(2))),
  'the refused drafts are still there');

-- Exactly 7 days, and 30: discarded; a stale revision is still refused.
select pg_temp.check(public.discard_draft(pg_temp.draft_of(3),
    (select revision + 1 from public.draft where id = pg_temp.draft_of(3))) ->> 'code' = 'revision_mismatch',
  'an old draft is still refused on a stale revision');
select pg_temp.check(public.discard_draft(pg_temp.draft_of(3)) ->> 'code' = 'discarded',
  'at exactly 7 days another editor discards it');
select pg_temp.check(public.discard_draft(pg_temp.draft_of(4)) ->> 'code' = 'discarded',
  'at 30 days another editor discards it');

-- A maker-less draft: any editor, at any age (H5 is old; check a fresh one too).
select pg_temp.check(public.discard_draft(pg_temp.draft_of(5)) ->> 'code' = 'discarded',
  'any editor discards an old maker-less draft');

select pg_temp.check(r ->> 'code' = 'draft_too_recent'
    and (r ->> 'discardable_from')::timestamptz > now() + interval '6 days 23 hours',
  'a draft with an old updated_at but a new created_at (unpublish) is fresh')
  from (select public.discard_draft(pg_temp.draft_of(6)) r) x;
select pg_temp.check(r ->> 'code' = 'draft_too_recent'
    and (r ->> 'discardable_from')::timestamptz <= now() + interval '7 days',
  'a stamp in the future counts as now: refused, but never for more than 7 days')
  from (select public.discard_draft(pg_temp.draft_of(7)) r) x;
-- The maker discards their own fresh draft at once, and a save moves the clock.
select set_config('request.jwt.claim.sub', '7e7e7e80-0000-0000-0000-0000000000e1', true);
select pg_temp.check(public.discard_draft(pg_temp.draft_of(1)) ->> 'code' = 'discarded',
  'the maker discards their own 1-day-old draft');
reset role;
-- H2, 6 days 23 h old, made 30 days old and then saved by its maker: fresh again.
update public.draft set updated_at = now() - interval '30 days' where id = pg_temp.draft_of(2);
alter table public.draft enable trigger draft_revision;
set role authenticated;
select public.save_draft(pg_temp.draft_of(2),
  (select revision from public.draft where id = pg_temp.draft_of(2)),
  (select payload from public.draft where id = pg_temp.draft_of(2)));
select set_config('request.jwt.claim.sub', '7e7e7e80-0000-0000-0000-0000000000e2', true);
select pg_temp.check(public.discard_draft(pg_temp.draft_of(2)) ->> 'code' = 'draft_too_recent',
  'a save by the maker starts the 7 days again');
reset role;

rollback;

-- Part two: read-only.
select * from (values
  (1, 'discard_draft answers draft_too_recent before it deletes',
   (select position('draft_too_recent' in prosrc) > 0
      and position('draft_too_recent' in prosrc) < position('delete from public.draft' in prosrc)
      from pg_proc where oid = 'public.discard_draft(uuid, integer)'::regprocedure)),
  (2, 'the interval is 7 days (the studio''s OTHER_EDITOR_DISCARD_DAYS must match)',
   (select prosrc like '%interval ''7 days''%'
      from pg_proc where oid = 'public.discard_draft(uuid, integer)'::regprocedure)),
  (3, 'a definer with a pinned path, for authenticated and not anon or PUBLIC',
   (select prosecdef and proconfig @> array['search_path=""']
      and has_function_privilege('authenticated', oid, 'execute')
      and not has_function_privilege('anon', oid, 'execute')
      and not has_function_privilege('public', oid, 'execute')
      from pg_proc where oid = 'public.discard_draft(uuid, integer)'::regprocedure)),
  (4, 'draft_delete is still the maker''s only',
   (select qual like '%editor_id%' and qual like '%uid%' and qual not like '%IS NULL%'
      from pg_policies where schemaname = 'public' and tablename = 'draft' and policyname = 'draft_delete')),
  (5, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'discard_stale_draft'))
) as c(n, what, ok) order by n;
