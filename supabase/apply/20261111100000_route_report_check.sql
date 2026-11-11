-- ParaPo — checks after applying the route_report migration.
--
-- Two parts. The first adds a test editor, a non-editor, two routes and reports, proves the
-- behaviour, and rolls every one of them back: it raises "FAILED: ..." on the first wrong result,
-- and nothing it did remains. It proves that report_sender can send a report and nothing else,
-- that every cap holds, that anon and a signed-in non-editor see and send nothing, and that an
-- editor reads reports and sets only their status, with who and when filled in for them. The
-- second part is read-only: one row per check, every ok should be t.

-- Part one: the behaviour, rolled back.
begin;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;
grant execute on function pg_temp.check(boolean, text) to public;
-- Runs `statement` as the caller and passes only when it is refused for want of privilege.
create function pg_temp.refused(statement text) returns boolean language plpgsql as $$
begin
  execute statement;
  raise exception 'FAILED: allowed: %', statement;
exception when insufficient_privilege then return true;
end $$;
grant execute on function pg_temp.refused(text) to public;
-- The check runs as each role in turn; postgres made report_sender, so it may take it on.
grant report_sender to postgres;

-- Ids start 7e7e7e90 so nothing live shares them.
insert into auth.users (id, is_anonymous) values
  ('7e7e7e90-0000-0000-0000-0000000000e1', false),
  ('7e7e7e90-0000-0000-0000-0000000000e2', false);
insert into private.editor (user_id) values ('7e7e7e90-0000-0000-0000-0000000000e1');
insert into public.stop (id, owner_id, name, kind, point) values
  ('7e7e7e90-0000-0000-0000-0000000000a1', '7e7e7e90-0000-0000-0000-0000000000e1', 'Report check T1',
   'terminal', '{"type":"Point","coordinates":[121.25,14.6]}'),
  ('7e7e7e90-0000-0000-0000-0000000000a2', '7e7e7e90-0000-0000-0000-0000000000e1', 'Report check T2',
   'terminal', '{"type":"Point","coordinates":[121.27,14.6]}'),
  ('7e7e7e90-0000-0000-0000-0000000000a3', '7e7e7e90-0000-0000-0000-0000000000e1', 'Report check T3',
   'terminal', '{"type":"Point","coordinates":[121.29,14.6]}');
insert into public.route (id, owner_id, signboard, head_stop_id, tail_stop_id) values
  ('7e7e7e90-0000-0000-0000-0000000000b1', '7e7e7e90-0000-0000-0000-0000000000e1', 'Report check',
   '7e7e7e90-0000-0000-0000-0000000000a1', '7e7e7e90-0000-0000-0000-0000000000a2'),
  ('7e7e7e90-0000-0000-0000-0000000000b2', '7e7e7e90-0000-0000-0000-0000000000e1', 'Report check 2',
   '7e7e7e90-0000-0000-0000-0000000000a2', '7e7e7e90-0000-0000-0000-0000000000a1'),
  ('7e7e7e90-0000-0000-0000-0000000000b3', '7e7e7e90-0000-0000-0000-0000000000e1', 'Report check down',
   '7e7e7e90-0000-0000-0000-0000000000a1', '7e7e7e90-0000-0000-0000-0000000000a3');
update public.route set status = 'taken_down' where id = '7e7e7e90-0000-0000-0000-0000000000b3';
insert into public.route_variant (id, route_id, owner_id, reversed, shape) values
  ('7e7e7e90-0000-0000-0000-0000000000c1', '7e7e7e90-0000-0000-0000-0000000000b1',
   '7e7e7e90-0000-0000-0000-0000000000e1', false,
   '{"type":"LineString","coordinates":[[121.25,14.6],[121.27,14.6]]}'),
  ('7e7e7e90-0000-0000-0000-0000000000c2', '7e7e7e90-0000-0000-0000-0000000000b2',
   '7e7e7e90-0000-0000-0000-0000000000e1', false,
   '{"type":"LineString","coordinates":[[121.27,14.6],[121.25,14.6]]}');
-- Live reports would count against the caps below: set them aside (the rollback brings them back).
delete from public.route_report;

-- The Worker's role: it sends, and does nothing else.
set role report_sender;
select pg_temp.check(report.submit_route_report('7e7e7e90-0000-0000-0000-0000000000b1', null, 'wrong_line', '  The jeep turns at the market now.  ') = 'sent',
  'a report on a published route is sent');
select pg_temp.check(report.submit_route_report('7e7e7e90-0000-0000-0000-0000000000b1', '7e7e7e90-0000-0000-0000-0000000000c1', 'wrong_line', 'Wrong way') = 'sent',
  'a report naming its direction is sent');
select pg_temp.check(report.submit_route_report('7e7e7e90-0000-0000-0000-0000000000b1', null, 'nonsense', 'Words') = 'bad_kind',
  'a kind not on the list');
select pg_temp.check(report.submit_route_report('7e7e7e90-0000-0000-0000-0000000000b1', null, null, 'Words') = 'bad_kind', 'no kind');
select pg_temp.check(report.submit_route_report('7e7e7e90-0000-0000-0000-0000000000b1', null, 'other', '   ') = 'bad_note',
  'other with blank words');
select pg_temp.check(report.submit_route_report('7e7e7e90-0000-0000-0000-0000000000b1', null, 'other', null) = 'bad_note',
  'other with no words');
select pg_temp.check(report.submit_route_report('7e7e7e90-0000-0000-0000-0000000000b1', null, 'wrong_fare', repeat('x', 501)) = 'bad_note',
  'more than 500 characters');
select pg_temp.check(report.submit_route_report('7e7e7e90-0000-0000-0000-0000000000b1', null, 'no_longer_runs', '   ') = 'sent',
  'a kind with no words is sent');
select pg_temp.check(report.submit_route_report('7e7e7e90-0000-0000-0000-00000000ffff', null, 'wrong_line', 'No such route') = 'unknown_route',
  'a route that does not exist');
select pg_temp.check(report.submit_route_report('7e7e7e90-0000-0000-0000-0000000000b3', null, 'wrong_line', 'Taken down') = 'unknown_route',
  'a taken-down route');
select pg_temp.check(report.submit_route_report('7e7e7e90-0000-0000-0000-0000000000b1', '7e7e7e90-0000-0000-0000-0000000000c2', 'wrong_line', 'Other route''s direction') = 'unknown_route',
  'a direction of another route');
select pg_temp.check(pg_temp.refused($$select * from public.route_report$$), 'report_sender reads route_report');
select pg_temp.check(pg_temp.refused($$insert into public.route_report (route_id, kind, note) values
    ('7e7e7e90-0000-0000-0000-0000000000b1', 'other', 'direct')$$), 'report_sender inserts directly');
select pg_temp.check(pg_temp.refused($$select * from public.route$$), 'report_sender reads route');
select pg_temp.check(pg_temp.refused($$select * from private.editor$$), 'report_sender reads the editors');
reset role;

-- What a report holds: the route, the direction, the kind, the words trimmed, open, nobody's.
select pg_temp.check((select count(*) = 3 and bool_and(status = 'open' and resolved_by is null and resolved_at is null)
  from public.route_report), 'three open reports, resolved by nobody');
select pg_temp.check(exists (select 1 from public.route_report where kind = 'no_longer_runs' and note is null),
  'blank words are kept as none');
select pg_temp.check(exists (select 1 from public.route_report where note = 'The jeep turns at the market now.'),
  'the words are kept, trimmed');

-- The caps. A route takes 20 a day: 18 more go, the 21st is refused.
set role report_sender;
select pg_temp.check(report.submit_route_report('7e7e7e90-0000-0000-0000-0000000000b1', null, 'wrong_line', 'Again ' || n) = 'sent',
  'report ' || n || ' on the route') from generate_series(4, 20) n;
select pg_temp.check(report.submit_route_report('7e7e7e90-0000-0000-0000-0000000000b1', null, 'wrong_line', 'One too many') = 'route_full',
  'the 21st report on one route in a day');
-- Another route still takes reports, up to 30 in any minute.
select pg_temp.check(report.submit_route_report('7e7e7e90-0000-0000-0000-0000000000b2', null, 'wrong_line', 'Other ' || n) = 'sent',
  'report ' || n || ' in the minute') from generate_series(21, 30) n;
select pg_temp.check(report.submit_route_report('7e7e7e90-0000-0000-0000-0000000000b2', null, 'wrong_line', 'Busy') = 'busy',
  'the 31st report in a minute');
reset role;
-- 2000 in a day: the minute's reports moved to an hour ago, the day filled.
update public.route_report set created_at = now() - interval '1 hour';
insert into public.route_report (route_id, kind, note, created_at)
  select '7e7e7e90-0000-0000-0000-0000000000b2', 'other', 'Filler', now() - interval '2 hours' from generate_series(1, 1970);
set role report_sender;
select pg_temp.check(report.submit_route_report('7e7e7e90-0000-0000-0000-0000000000b2', null, 'wrong_line', 'Day full') = 'full',
  'the 2001st report in a day');
reset role;
-- 50,000 in all: the day emptied, the table filled with older reports.
update public.route_report set created_at = now() - interval '2 days';
insert into public.route_report (route_id, kind, note, created_at)
  select '7e7e7e90-0000-0000-0000-0000000000b2', 'other', 'Old', now() - interval '3 days' from generate_series(1, 48000);
set role report_sender;
select pg_temp.check(report.submit_route_report('7e7e7e90-0000-0000-0000-0000000000b2', null, 'wrong_line', 'Table full') = 'full',
  'the 50,001st report');
reset role;
delete from public.route_report where note in ('Filler', 'Old') or note like 'Again %' or note like 'Other %';

-- anon reaches neither the function nor the table.
set role anon;
select pg_temp.check(pg_temp.refused($$select report.submit_route_report('7e7e7e90-0000-0000-0000-0000000000b1', null, 'wrong_line', 'anon')$$),
  'anon sends a report');
select pg_temp.check(pg_temp.refused($$select * from public.route_report$$), 'anon reads route_report');
reset role;

-- A signed-in non-editor sends nothing and sees nothing.
set role authenticated;
select set_config('request.jwt.claim.sub', '7e7e7e90-0000-0000-0000-0000000000e2', true);
select pg_temp.check(pg_temp.refused($$select report.submit_route_report('7e7e7e90-0000-0000-0000-0000000000b1', null, 'wrong_line', 'user')$$),
  'a signed-in user sends a report');
select pg_temp.check((select count(*) from public.route_report) = 0, 'a non-editor sees no reports');
reset role;

-- An editor reads them and sets only the status; who and when follow it.
set role authenticated;
select set_config('request.jwt.claim.sub', '7e7e7e90-0000-0000-0000-0000000000e1', true);
select pg_temp.check((select count(*) from public.route_report) = 3, 'an editor reads the reports');
update public.route_report set status = 'done' where note = 'Wrong way';
select pg_temp.check(pg_temp.refused($$update public.route_report set note = 'changed'$$), 'an editor changes the words');
select pg_temp.check(pg_temp.refused($$update public.route_report set resolved_by = null$$), 'an editor sets who resolved it');
select pg_temp.check(pg_temp.refused($$insert into public.route_report (route_id, kind, note) values
    ('7e7e7e90-0000-0000-0000-0000000000b1', 'other', 'editor')$$), 'an editor inserts a report');
select pg_temp.check(pg_temp.refused($$delete from public.route_report$$), 'an editor deletes a report');
reset role;
select pg_temp.check((select resolved_by = '7e7e7e90-0000-0000-0000-0000000000e1' and resolved_at is not null
  from public.route_report where note = 'Wrong way'), 'done: resolved by the editor, now');
set role authenticated;
select set_config('request.jwt.claim.sub', '7e7e7e90-0000-0000-0000-0000000000e1', true);
update public.route_report set status = 'open' where note = 'Wrong way';
reset role;
select pg_temp.check((select resolved_by is null and resolved_at is null from public.route_report where note = 'Wrong way'),
  'reopened: resolved by nobody again');
rollback;

-- Part two: read-only. Every ok should be t.
select 1 as n, 'route_report: row security on, editors read and update, no insert or delete policy' as what,
  (select relrowsecurity from pg_class where oid = 'public.route_report'::regclass)
  and (select count(*) = 2 from pg_policies where schemaname = 'public' and tablename = 'route_report'
       and cmd in ('SELECT', 'UPDATE'))
  and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'route_report'
                  and cmd in ('INSERT', 'DELETE', 'ALL')) as ok
union all
select 2, 'report.submit_route_report: report_sender runs it; public, anon and authenticated do not',
  has_function_privilege('report_sender', 'report.submit_route_report(uuid, uuid, text, text)', 'execute')
  and not has_function_privilege('anon', 'report.submit_route_report(uuid, uuid, text, text)', 'execute')
  and not has_function_privilege('authenticated', 'report.submit_route_report(uuid, uuid, text, text)', 'execute')
  and not exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                  where p.oid = 'report.submit_route_report(uuid, uuid, text, text)'::regprocedure and a.grantee = 0)
union all
select 3, 'report.submit_route_report: security definer, search_path empty',
  (select prosecdef and proconfig = array['search_path=""']
   from pg_proc where oid = 'report.submit_route_report(uuid, uuid, text, text)'::regprocedure)
union all
select 4, 'report_sender: no privilege on any table in public, private or report',
  not exists (select 1 from pg_class c join pg_namespace s on s.oid = c.relnamespace
              where s.nspname in ('public', 'private', 'report') and c.relkind in ('r', 'v', 'm', 'p')
                and (has_table_privilege('report_sender', c.oid, 'select')
                     or has_table_privilege('report_sender', c.oid, 'insert')
                     or has_table_privilege('report_sender', c.oid, 'update')
                     or has_table_privilege('report_sender', c.oid, 'delete')))
union all
select 5, 'route_report holds no IP, location, device or account: exactly its nine columns',
  (select array_agg(attname::text order by attnum) from pg_attribute
   where attrelid = 'public.route_report'::regclass and attnum > 0 and not attisdropped)
  = array['id', 'route_id', 'direction_id', 'kind', 'note', 'status', 'created_at', 'resolved_by', 'resolved_at']
union all
select 6, 'report_sender: no login yet, or a login the owner set; at most 5 connections',
  (select rolconnlimit = 5 and not rolsuper and not rolcreaterole and not rolcreatedb and not rolbypassrls
   from pg_roles where rolname = 'report_sender');
