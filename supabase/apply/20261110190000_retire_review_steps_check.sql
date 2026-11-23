-- ParaPo — checks after applying the retire_review_steps migration.
--
-- Two parts. The first adds a test editor and a hotspot, proves the behaviour, and rolls every one
-- of them back: it raises "FAILED: ..." on the first wrong result, and nothing it did remains. It
-- proves that a draft can no longer be updated directly, that the old review functions are gone,
-- and that the new path still saves (naming its saver) and publishes. The second part is
-- read-only: one row per check, every ok should be t.

-- Part one: the behaviour, rolled back.
begin;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;
grant execute on function pg_temp.check(boolean, text) to authenticated;
create function pg_temp.draft_of(sid uuid) returns public.draft language sql as $$
  select * from public.draft where subject_id = sid;
$$;
grant execute on function pg_temp.draft_of(uuid) to authenticated;

-- Ids start 7e7e7e81 so nothing live shares them.
insert into auth.users (id, is_anonymous) values ('7e7e7e81-0000-0000-0000-0000000000e1', false);
insert into private.editor (user_id) values ('7e7e7e81-0000-0000-0000-0000000000e1');

set role authenticated;
select set_config('request.jwt.claim.sub', '7e7e7e81-0000-0000-0000-0000000000e1', true);
select public.claim_draft('hotspot', '7e7e7e81-0000-0000-0000-0000000000a1', true, null,
  jsonb_build_object('version', 1, 'stop', jsonb_build_object('name', 'Retire check', 'informal', null,
    'aliases', '[]'::jsonb, 'kind', 'hintuan', 'note', null, 'line', null,
    'point', '{"type":"Point","coordinates":[121.22,14.6]}'::jsonb, 'area', null), 'links', '[]'::jsonb));
do $$ begin
  update public.draft set status = 'pending' where subject_id = '7e7e7e81-0000-0000-0000-0000000000a1';
  raise exception 'FAILED: a draft was updated directly';
exception when insufficient_privilege then null; end $$;
select pg_temp.check(public.save_draft(d.id, d.revision,
    jsonb_set(d.payload, '{stop,note}', '"Saved"')) ->> 'code' = 'ok', 'save_draft still saves')
  from pg_temp.draft_of('7e7e7e81-0000-0000-0000-0000000000a1') d;
select pg_temp.check(d.last_saved_by = '7e7e7e81-0000-0000-0000-0000000000e1' and d.revision = 2,
  'naming its saver') from pg_temp.draft_of('7e7e7e81-0000-0000-0000-0000000000a1') d;
select pg_temp.check(public.publish_draft(d.id, d.revision) ->> 'code' = 'approved', 'publish_draft still publishes')
  from pg_temp.draft_of('7e7e7e81-0000-0000-0000-0000000000a1') d;
reset role;
select pg_temp.check(s.note = 'Saved' and s.status = 'approved'
    and s.published_by = '7e7e7e81-0000-0000-0000-0000000000e1', 'as saved, stamped')
  from public.stop s where s.id = '7e7e7e81-0000-0000-0000-0000000000a1';

rollback;

-- Part two: read-only.
select * from (values
  (1, 'approve_draft, approve_reviewed_draft, submit_draft and send_back_draft are gone',
   (select to_regprocedure('public.approve_draft(uuid)') is null
       and to_regprocedure('public.approve_reviewed_draft(uuid, integer)') is null
       and to_regprocedure('public.submit_draft(uuid, integer)') is null
       and to_regprocedure('public.send_back_draft(uuid, integer, text)') is null)),
  (2, 'no direct update of a draft: no grant, no draft_update policy',
   (select not has_table_privilege('authenticated', 'public.draft', 'update')
       and not has_any_column_privilege('authenticated', 'public.draft', 'update')
       and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'draft'
                         and policyname = 'draft_update'))),
  (3, 'save_draft, publish_draft and unpublish are still editors''',
   (select bool_and(has_function_privilege('authenticated', f, 'execute'))
      from unnest(array['public.save_draft(uuid, integer, jsonb)', 'public.publish_draft(uuid, integer)',
                        'public.unpublish(text, uuid)']) f)),
  (4, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'retire_review_steps'))
) as c(n, what, ok) order by n;
