-- Assertions on 20261022090000_contribution_use.sql. Runs on a database with every
-- migration applied and before-0018.sql's editor e1; every block raises on a
-- wrong result. Fixtures are rolled back.
begin;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;
grant execute on function pg_temp.check(boolean, text) to anon, authenticated;

insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000a1', true),
  ('00000000-0000-0000-0000-0000000000e1', false)
on conflict (id) do nothing;
insert into public.contributor (id) values ('00000000-0000-0000-0000-0000000000a1');
-- The insert trigger stamps the owner from the caller, so sign in as the phone first.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
-- A recording that arrived this month, long enough to trim, with a hintuan near each end and one mid-ride.
insert into public.contribution (id, contributor_id, format_version, rules_version, consent_version,
  started_at, ended_at, sent_at, distance_m, moving_s, standing_s, lost_s, point_count, events, gaps,
  line, west, south, east, north, start_name, end_name, description)
values ('11111111-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 1, 1, 1,
  now() - interval '1 hour', now(), now(), 800, 100, 10, 0, 6, '[]', '[]',
  '{"type":"LineString","coordinates":[[121.0,14.0],[121.001,14.0],[121.003,14.0],[121.005,14.0],[121.007,14.0],[121.0075,14.0]]}',
  121.0, 14.0, 121.0075, 14.0, 'A', 'B', 'text');
insert into public.hinto (contribution_id, seq, started_at, seconds, lat, lng, rules_version) values
  ('11111111-0000-0000-0000-0000000000c1', 0, now(), 5, 14.0, 121.0005, 1),
  ('11111111-0000-0000-0000-0000000000c1', 1, now(), 5, 14.0, 121.004, 1);

-- anon reaches none of it.
set role anon;
do $$ begin perform 1 from public.contribution_use; raise exception 'FAILED: anon read contribution_use';
exception when insufficient_privilege then null; end $$;
do $$ begin perform public.block_contributor('00000000-0000-0000-0000-0000000000a1', 'x'); raise exception 'FAILED: anon blocked';
exception when insufficient_privilege then null; end $$;
reset role;

-- A phone (not an editor) sees and adds nothing, blocks nothing, and cannot unblock itself.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
select pg_temp.check((select count(*) = 0 from public.contribution_use), 'a phone reads no uses');
do $$ begin
  insert into public.contribution_use (contribution_id, kind, subject_id)
  values ('11111111-0000-0000-0000-0000000000c1', 'direction', gen_random_uuid());
  raise exception 'FAILED: a phone added a use';
exception when insufficient_privilege then null; end $$;
do $$ begin perform public.block_contributor('00000000-0000-0000-0000-0000000000a1', 'x'); raise exception 'FAILED: a phone blocked';
exception when insufficient_privilege then null; end $$;
do $$ begin perform public.unblock_contributor('00000000-0000-0000-0000-0000000000a1'); raise exception 'FAILED: a phone unblocked';
exception when insufficient_privilege then null; end $$;
do $$ begin update public.contributor set blocked_at = null; raise exception 'FAILED: a phone updated contributor';
exception when insufficient_privilege then null; end $$;
reset role;

-- The editor adds, reads, and deletes uses; the link is unique and kinds are checked; editor_id can't be forged.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
insert into public.contribution_use (contribution_id, kind, subject_id)
  values ('11111111-0000-0000-0000-0000000000c1', 'direction', '22222222-0000-0000-0000-000000000001');
select pg_temp.check((select editor_id = '00000000-0000-0000-0000-0000000000e1' from public.contribution_use), 'editor_id is the editor');
do $$ begin
  insert into public.contribution_use (contribution_id, kind, subject_id)
  values ('11111111-0000-0000-0000-0000000000c1', 'direction', '22222222-0000-0000-0000-000000000001');
  raise exception 'FAILED: a duplicate use was added';
exception when unique_violation then null; end $$;
do $$ begin
  insert into public.contribution_use (contribution_id, kind, subject_id)
  values ('11111111-0000-0000-0000-0000000000c1', 'nonsense', gen_random_uuid());
  raise exception 'FAILED: a bad kind was added';
exception when check_violation then null; end $$;
do $$ begin
  insert into public.contribution_use (contribution_id, kind, subject_id, editor_id)
  values ('11111111-0000-0000-0000-0000000000c1', 'hintuan', gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1');
  raise exception 'FAILED: editor_id was forged';
exception when insufficient_privilege then null; end $$;
do $$ begin update public.contribution_use set kind = 'hintuan'; raise exception 'FAILED: a use was updated';
exception when insufficient_privilege then null; end $$;

-- Block, then the phone cannot contribute; unblock restores it; an unknown phone is refused.
select public.block_contributor('00000000-0000-0000-0000-0000000000a1', 'spam');
reset role;
select pg_temp.check((select blocked_at is not null and blocked_by = '00000000-0000-0000-0000-0000000000e1' and block_note = 'spam'
  from public.contributor), 'block stamps who, when and why');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
select pg_temp.check(not private.can_contribute(), 'a blocked phone cannot contribute');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
select public.unblock_contributor('00000000-0000-0000-0000-0000000000a1');
do $$ begin perform public.block_contributor(gen_random_uuid(), 'x'); raise exception 'FAILED: blocked a phone that does not exist';
exception when no_data_found then null; end $$;
reset role;
select pg_temp.check((select blocked_at is null and blocked_by is null and block_note is null from public.contributor), 'unblock clears all three');

-- Retention: refused for a recent month, then done once and a second run changes nothing.
select pg_temp.check((select count(*) from public.contribution_use) = 1, 'one use before retiring');
do $$ begin perform private.retire_month(date_trunc('month', now() at time zone 'UTC')::date); raise exception 'FAILED: retired a recent month';
exception when sqlstate 'P0001' then if sqlerrm not like 'too_soon%' then raise; end if; end $$;
do $$ begin perform private.retire_month(date '2026-10-15', 0); raise exception 'FAILED: retired a non-month';
exception when sqlstate 'P0001' then if sqlerrm not like 'bad_month%' then raise; end if; end $$;
select pg_temp.check((private.retire_month(date_trunc('month', now() at time zone 'UTC')::date, 0) ->> 'contributions')::int = 1, 'retire_month retires the month');
select pg_temp.check((select contributor_id is null and start_name is null and end_name is null and description is null
  and line = '{"type":"LineString","coordinates":[[121.003,14.0],[121.005,14.0]]}'::jsonb and west = 121.003 and east = 121.005
  from public.contribution), 'ends cut by 200 m, text cleared, phone unlinked, box follows the line');
select pg_temp.check((select array_agg(seq) = array[1::smallint] from public.hinto), 'the hintos near the ends are gone, the other stays');
select pg_temp.check((select count(*) = 1 from public.contribution_use), 'the use is kept');
select pg_temp.check((private.retire_month(date_trunc('month', now() at time zone 'UTC')::date, 0) ->> 'contributions')::int = 0, 'a second run changes nothing');
select pg_temp.check((select count(*) = 1 from public.hinto) and (select line ->> 'type' = 'LineString' from public.contribution), 'a second run left the rows alone');
select pg_temp.check(to_regclass('public.point_batch_' || to_char(now() at time zone 'UTC', 'YYYY_MM')) is null, 'the monthly piece is dropped');

-- Pieces ahead: add_months continues after the last one.
create temp table made as select private.add_months(2) as last_made, private.last_piece_month() as before_made;
select pg_temp.check((select last_made = (before_made + interval '2 months')::date from made), 'add_months makes two pieces after the last');
select pg_temp.check((select last_made = private.last_piece_month() from made), 'add_months returns the last piece it made');
rollback;
