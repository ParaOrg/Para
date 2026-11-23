-- ParaPo — checks after applying the draft_update_makerless migration.
--
-- Two parts. The first adds two test editors and a hotspot with drafts,
-- proves the behaviour, and rolls every one of them back: it raises
-- "FAILED: ..." on the first wrong result, and nothing it did remains. It
-- proves:
--   - any editor edits a draft whose maker is gone (payload, status,
--     submitted_at, note), and it stays maker-less;
--   - nobody can set editor_id, so a draft is never handed to nobody or to
--     someone else;
--   - another editor still cannot edit, delete or discard a draft whose maker
--     is there (not_your_draft), and the maker can edit it;
--   - a maker-less draft is still discarded by any editor and not deleted
--     directly.
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

-- Ids start 7e7e7e7f so nothing live shares them.
insert into auth.users (id, is_anonymous) values
  ('7e7e7e7f-0000-0000-0000-0000000000e1', false), ('7e7e7e7f-0000-0000-0000-0000000000e2', false);
insert into private.editor (user_id) values
  ('7e7e7e7f-0000-0000-0000-0000000000e1'), ('7e7e7e7f-0000-0000-0000-0000000000e2');
insert into public.stop (id, owner_id, name, kind, point) values
  ('7e7e7e7f-0000-0000-0000-0000000000a1', '7e7e7e7f-0000-0000-0000-0000000000e1',
   'Maker-less check H1', 'hintuan', '{"type":"Point","coordinates":[121.15,14.6]}'),
  ('7e7e7e7f-0000-0000-0000-0000000000a2', '7e7e7e7f-0000-0000-0000-0000000000e1',
   'Maker-less check H2', 'hintuan', '{"type":"Point","coordinates":[121.16,14.6]}');

set role authenticated;
select set_config('request.jwt.claim.sub', '7e7e7e7f-0000-0000-0000-0000000000e1', true);
-- h1's draft: its maker will be gone. h2's: its maker (e1) stays.
select public.claim_draft('hotspot', '7e7e7e7f-0000-0000-0000-0000000000a1', false,
  (select revision from public.stop where id = '7e7e7e7f-0000-0000-0000-0000000000a1'),
  pg_temp.payload('7e7e7e7f-0000-0000-0000-0000000000a1'));
select public.claim_draft('hotspot', '7e7e7e7f-0000-0000-0000-0000000000a2', false,
  (select revision from public.stop where id = '7e7e7e7f-0000-0000-0000-0000000000a2'),
  pg_temp.payload('7e7e7e7f-0000-0000-0000-0000000000a2'));
reset role;
update public.draft set editor_id = null where subject_id = '7e7e7e7f-0000-0000-0000-0000000000a1';
set role authenticated;

-- e2 edits the maker-less draft; it stays maker-less.
select set_config('request.jwt.claim.sub', '7e7e7e7f-0000-0000-0000-0000000000e2', true);
with u as (update public.draft set payload = jsonb_set(payload, '{stop,note}', '"Picked up"'),
    status = 'draft', submitted_at = null, note = 'Taken over'
  where subject_id = '7e7e7e7f-0000-0000-0000-0000000000a1' returning editor_id)
select pg_temp.check((select count(*) = 1 and bool_and(editor_id is null) from u),
  'another editor edits a maker-less draft, and it stays maker-less');
do $$ begin
  update public.draft set editor_id = '7e7e7e7f-0000-0000-0000-0000000000e2'
    where subject_id = '7e7e7e7f-0000-0000-0000-0000000000a1';
  raise exception 'FAILED: an editor took over a maker-less draft''s editor_id';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.draft set editor_id = null where subject_id = '7e7e7e7f-0000-0000-0000-0000000000a2';
  raise exception 'FAILED: an editor handed a draft to nobody';
exception when insufficient_privilege then null; end $$;

-- e2 still cannot touch e1's draft.
with u as (update public.draft set note = 'Not mine' where subject_id = '7e7e7e7f-0000-0000-0000-0000000000a2' returning 1)
select pg_temp.check((select count(*) = 0 from u), 'another editor edits no one else''s draft');
with x as (delete from public.draft where subject_id = '7e7e7e7f-0000-0000-0000-0000000000a2' returning 1)
select pg_temp.check((select count(*) = 0 from x), 'another editor deletes no one else''s draft');
select pg_temp.check(public.discard_draft(id) ->> 'code' = 'not_your_draft', 'another editor cannot discard it')
  from public.draft where subject_id = '7e7e7e7f-0000-0000-0000-0000000000a2';

-- A maker-less draft: not deleted directly, discarded by any editor.
with x as (delete from public.draft where subject_id = '7e7e7e7f-0000-0000-0000-0000000000a1' returning 1)
select pg_temp.check((select count(*) = 0 from x), 'a maker-less draft is not deleted directly');
select pg_temp.check(public.discard_draft(id) ->> 'code' = 'discarded', 'any editor discards a maker-less draft')
  from public.draft where subject_id = '7e7e7e7f-0000-0000-0000-0000000000a1';

-- The maker edits their own.
select set_config('request.jwt.claim.sub', '7e7e7e7f-0000-0000-0000-0000000000e1', true);
with u as (update public.draft set note = 'Mine' where subject_id = '7e7e7e7f-0000-0000-0000-0000000000a2' returning 1)
select pg_temp.check((select count(*) = 1 from u), 'the maker edits their own draft');
reset role;

rollback;

-- Part two: read-only.
select * from (values
  (1, 'draft_update: the maker or a maker-less draft, in using and in with check',
   (select qual like '%editor_id%' and qual like '%uid%' and qual like '%IS NULL%'
           and with_check like '%editor_id%' and with_check like '%uid%' and with_check like '%IS NULL%'
      from pg_policies where schemaname = 'public' and tablename = 'draft' and policyname = 'draft_update'
        and cmd = 'UPDATE' and roles = '{authenticated}')),
  (2, 'authenticated still updates only payload, status, submitted_at and note',
   (select not has_table_privilege('authenticated', 'public.draft', 'update')
      and bool_and(has_column_privilege('authenticated', 'public.draft', a.attname, 'update')
                   = (a.attname in ('payload', 'status', 'submitted_at', 'note')))
      from pg_attribute a where a.attrelid = 'public.draft'::regclass and a.attnum > 0 and not a.attisdropped)),
  (3, 'draft_delete is still the maker''s only',
   (select qual like '%uid%' and qual not like '%IS NULL%'
      from pg_policies where schemaname = 'public' and tablename = 'draft' and policyname = 'draft_delete')),
  (4, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'draft_update_makerless'))
) as c(n, what, ok) order by n;
