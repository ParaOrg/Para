-- Disposable database only; every fixture and mutation is rolled back.
begin;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;
set role anon;
do $$ begin perform public.approve_reviewed_draft(gen_random_uuid(), 1); raise exception 'anon approved'; exception when insufficient_privilege then null; end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
do $$ begin perform public.refresh_draft_base(gen_random_uuid(), 1, 1); raise exception 'non-editor rebased'; exception when insufficient_privilege then null; end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
create temp table reviewed_fixture as select gen_random_uuid() as subject, null::uuid as draft, 0::integer as seen;
select public.claim_draft('hotspot', subject, true, null, '{"version":1,"stop":{"name":"Guard preview","informal":null,"aliases":[],"kind":"hintuan","note":"Reviewed note","area":null,"point":{"type":"Point","coordinates":[121.1,14.7]},"line":null},"links":[]}'::jsonb) from reviewed_fixture;
update reviewed_fixture set draft=(select id from public.draft where subject_id=subject);
select public.submit_draft(draft, 1) from reviewed_fixture;
update reviewed_fixture set seen=(select revision from public.draft where id=draft);
-- Another editor changes and re-submits while the first review stays open.
update public.draft set payload=jsonb_set(payload,'{stop,note}','"Not reviewed by the first editor"'), status='draft' where id=(select draft from reviewed_fixture);
select public.submit_draft(id, revision) from public.draft where id=(select draft from reviewed_fixture);
select pg_temp.check(public.approve_reviewed_draft(draft, seen)->>'code'='revision_mismatch', 'stale reviewer refused') from reviewed_fixture;
select pg_temp.check(not exists(select from public.stop where id=subject), 'refusal wrote no approved place') from reviewed_fixture;
select pg_temp.check(public.approve_reviewed_draft(id, revision)->>'code'='approved', 'current reviewed revision approved') from public.draft where id=(select draft from reviewed_fixture);
select pg_temp.check(public.approve_reviewed_draft(draft, seen)->>'code'='no_draft', 'lost response retry is no_draft') from reviewed_fixture;
-- A base conflict is explicit, and rebasing never approves the draft.
select public.claim_draft('hotspot', s.id, false, s.revision, jsonb_build_object('version',1,'stop',jsonb_build_object('name',s.name,'informal',s.informal,'aliases',to_jsonb(s.aliases),'kind',s.kind,'note','Draft replacement','area',s.area,'point',s.point,'line',s.line),'links','[]'::jsonb)) from public.stop s where s.id=(select subject from reviewed_fixture);
update reviewed_fixture set draft=(select id from public.draft where subject_id=subject);
update public.stop set note='Concurrent approved edit' where id=(select subject from reviewed_fixture);
select public.submit_draft(id, revision) from public.draft where id=(select draft from reviewed_fixture);
select pg_temp.check(public.approve_reviewed_draft(id, revision)->>'code'='conflict', 'base conflict refused') from public.draft where id=(select draft from reviewed_fixture);
select pg_temp.check(public.refresh_draft_base(d.id,d.revision,s.revision-1)->>'code'='conflict', 'stale latest-approved comparison refused') from public.draft d, public.stop s where d.id=(select draft from reviewed_fixture) and s.id=d.subject_id;
select pg_temp.check(public.refresh_draft_base(d.id,d.revision,s.revision)->>'code'='ok', 'explicit base refresh accepted') from public.draft d, public.stop s where d.id=(select draft from reviewed_fixture) and s.id=d.subject_id;
select pg_temp.check((select status='draft' from public.draft where id=draft), 'base refresh requires resubmission') from reviewed_fixture;
select pg_temp.check((select note='Concurrent approved edit' from public.stop where id=subject), 'base refresh never writes approved data') from reviewed_fixture;
rollback;
