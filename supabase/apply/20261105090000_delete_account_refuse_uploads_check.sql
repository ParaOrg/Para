-- ParaPo — checks after applying the delete_account_refuse_uploads migration.
--
-- Two parts. The first adds test users and their rows, proves the behaviour,
-- and rolls every one of them back: it raises "FAILED: ..." on the first wrong
-- result, and nothing it did remains. It proves:
--   - with no argument (the oldest apps on phones), with delete_uploads => true
--     (0.2.0 with its switch on) and with null, an account is refused with
--     SQLSTATE P0001 'delete_uploads_refused: …', and keeps everything: its user,
--     contributor row, contribution, point batch, hinto, use, retired totals and
--     gps_session.
--   - the refusal comes first: no caller, an anonymous phone, an editor and an
--     owner of map rows get it too when they leave out false.
--   - delete_uploads => false still deletes the person and keeps the uploads,
--     unlinked and marked, their typed words cleared; a retry is answered as deleted.
--   - with false, the usual refusals hold: an anonymous phone, an editor and an
--     owner of map rows keep everything.
--   - anon cannot call it.
-- The second part is read-only: one row per check, every ok should be t.

-- Part one: the behaviour, rolled back.
begin;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;
grant execute on function pg_temp.check(boolean, text) to anon, authenticated;

-- An account with one of everything, as a phone saves it and an editor uses it.
create function pg_temp.fill(who uuid, ride uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', who::text, true);
  insert into public.contributor (id) values (who) on conflict do nothing;
  insert into public.contribution (id, contributor_id, format_version, rules_version, consent_version,
    started_at, ended_at, sent_at, distance_m, moving_s, standing_s, lost_s, point_count, events, gaps)
  values (ride, who, 2, 2, 1, now() - interval '2 hours', now() - interval '1 hour', now(),
    100, 60, 10, 0, 2, '[]', '[]');
  insert into public.point_batch (contribution_id, seq, month, first_at, first_lat, first_lng,
    point_count, dt_ms, dlat, dlng, accuracy_m)
  values (ride, 0, date_trunc('month', now())::date, now() - interval '2 hours', 14600000, 121000000,
    2, '{0,1000}', '{0,10}', '{0,10}', '{5,5}');
  insert into public.hinto (contribution_id, seq, started_at, seconds, lat, lng, rules_version)
  values (ride, 0, now() - interval '2 hours', 10, 14.6, 121.0, 2);
  insert into public.contribution_use (contribution_id, kind, subject_id, editor_id)
  values (ride, 'direction', gen_random_uuid(), null);
  insert into private.contributor_retired_totals (contributor_id, rides, distance_m) values (who, 3, 900);
  insert into public.gps_session (owner_id) values (who);
end $$;

-- Everything an account and its one ride hold: each count is 1 while untouched.
create function pg_temp.holdings(who uuid, ride uuid) returns jsonb language sql as $$
  select jsonb_build_object(
    'user', (select count(*) from auth.users where id = who),
    'contributor', (select count(*) from public.contributor where id = who),
    'contribution', (select count(*) from public.contribution where id = ride and contributor_id = who),
    'point_batch', (select count(*) from public.point_batch where contribution_id = ride),
    'hinto', (select count(*) from public.hinto where contribution_id = ride),
    'contribution_use', (select count(*) from public.contribution_use where contribution_id = ride),
    'retired_totals', (select count(*) from private.contributor_retired_totals where contributor_id = who),
    'gps_session', (select count(*) from public.gps_session where owner_id = who)
  );
$$;
create function pg_temp.holds_all(who uuid, ride uuid) returns boolean language sql as $$
  select bool_and(value::integer = 1) from jsonb_each_text(pg_temp.holdings(who, ride));
$$;
-- Calls delete_my_account as `who` with `call` (a literal argument list) and passes only when it is
-- refused with `code` and a message starting `prefix`.
create function pg_temp.refused(who uuid, call text, code text, prefix text) returns boolean
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(who::text, ''), false);
  begin
    execute format('select public.delete_my_account(%s)', call);
  exception when others then
    if sqlstate = code and sqlerrm like prefix || '%' then return true; end if;
    raise exception 'FAILED: delete_my_account(%) refused as % %', call, sqlstate, sqlerrm;
  end;
  raise exception 'FAILED: delete_my_account(%) was not refused', call;
end $$;
grant execute on function pg_temp.refused(uuid, text, text, text) to authenticated;
grant execute on function pg_temp.holdings(uuid, uuid) to authenticated;

insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-0000000de5a1', false),
  ('00000000-0000-0000-0000-0000000de5a2', false),
  ('00000000-0000-0000-0000-0000000de5a3', false),
  ('00000000-0000-0000-0000-0000000de5a4', false),
  ('00000000-0000-0000-0000-0000000de5a5', true),
  ('00000000-0000-0000-0000-0000000de5a6', false),
  ('00000000-0000-0000-0000-0000000de5a7', false);
select pg_temp.fill('00000000-0000-0000-0000-0000000de5a1', '11111111-0000-0000-0000-0000000de5c1');
select pg_temp.fill('00000000-0000-0000-0000-0000000de5a2', '11111111-0000-0000-0000-0000000de5c2');
select pg_temp.fill('00000000-0000-0000-0000-0000000de5a3', '11111111-0000-0000-0000-0000000de5c3');
select pg_temp.fill('00000000-0000-0000-0000-0000000de5a4', '11111111-0000-0000-0000-0000000de5c4');
select pg_temp.fill('00000000-0000-0000-0000-0000000de5a5', '11111111-0000-0000-0000-0000000de5c5');
select pg_temp.fill('00000000-0000-0000-0000-0000000de5a6', '11111111-0000-0000-0000-0000000de5c6');
select pg_temp.fill('00000000-0000-0000-0000-0000000de5a7', '11111111-0000-0000-0000-0000000de5c7');
update public.contribution set start_name = 'Cubao', end_name = 'Quiapo', description = 'check words'
  where id = '11111111-0000-0000-0000-0000000de5c4';
-- The sixth is an editor; the seventh still owns a route of the map.
insert into private.editor (user_id) values ('00000000-0000-0000-0000-0000000de5a6');
insert into public.route (owner_id, signboard, is_loop)
  values ('00000000-0000-0000-0000-0000000de5a7', 'zz delete_account_refuse_uploads check', true);

-- anon reaches nothing.
set role anon;
do $$ begin perform public.delete_my_account(false); raise exception 'FAILED: anon called delete_my_account(false)';
exception when insufficient_privilege then null; end $$;
reset role;

set role authenticated;
-- Anything but false is refused first, whoever calls.
select pg_temp.check(pg_temp.refused('00000000-0000-0000-0000-0000000de5a1', '', 'P0001', 'delete_uploads_refused:'),
  'no argument is refused');
select pg_temp.check(pg_temp.refused('00000000-0000-0000-0000-0000000de5a2', 'delete_uploads => true', 'P0001', 'delete_uploads_refused:'),
  'true is refused');
select pg_temp.check(pg_temp.refused('00000000-0000-0000-0000-0000000de5a3', 'delete_uploads => null', 'P0001', 'delete_uploads_refused:'),
  'null is refused');
select pg_temp.check(pg_temp.refused('00000000-0000-0000-0000-0000000de5a1', 'true', 'P0001', 'delete_uploads_refused:'),
  'true, passed by position, is refused');
select pg_temp.check(pg_temp.refused(null, '', 'P0001', 'delete_uploads_refused:')
    and pg_temp.refused('00000000-0000-0000-0000-0000000de5a5', '', 'P0001', 'delete_uploads_refused:')
    and pg_temp.refused('00000000-0000-0000-0000-0000000de5a6', 'true', 'P0001', 'delete_uploads_refused:')
    and pg_temp.refused('00000000-0000-0000-0000-0000000de5a7', '', 'P0001', 'delete_uploads_refused:'),
  'the refusal comes before the others');
-- With false, the usual refusals hold.
select pg_temp.check(pg_temp.refused(null, 'false', '42501', 'not_signed_in'), 'no caller is refused');
select pg_temp.check(pg_temp.refused('00000000-0000-0000-0000-0000000de5a5', 'false', '42501', 'not_an_account'),
  'an anonymous phone is refused');
select pg_temp.check(pg_temp.refused('00000000-0000-0000-0000-0000000de5a6', 'delete_uploads => false', '42501', 'is_editor'),
  'an editor is refused');
select pg_temp.check(pg_temp.refused('00000000-0000-0000-0000-0000000de5a7', 'false', 'P0001', 'owns_map_rows'),
  'an owner of map rows is refused');
-- The fourth deletes itself and keeps its uploads; a retry is answered as deleted.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000de5a4', false);
select public.delete_my_account(delete_uploads => false);
select public.delete_my_account(delete_uploads => false);
reset role;

select pg_temp.check(pg_temp.holds_all('00000000-0000-0000-0000-0000000de5a1', '11111111-0000-0000-0000-0000000de5c1'),
  'refused with no argument, the account keeps everything: '
    || pg_temp.holdings('00000000-0000-0000-0000-0000000de5a1', '11111111-0000-0000-0000-0000000de5c1')::text);
select pg_temp.check(pg_temp.holds_all('00000000-0000-0000-0000-0000000de5a2', '11111111-0000-0000-0000-0000000de5c2'),
  'refused with true, the account keeps everything: '
    || pg_temp.holdings('00000000-0000-0000-0000-0000000de5a2', '11111111-0000-0000-0000-0000000de5c2')::text);
select pg_temp.check(pg_temp.holds_all('00000000-0000-0000-0000-0000000de5a3', '11111111-0000-0000-0000-0000000de5c3'),
  'refused with null, the account keeps everything: '
    || pg_temp.holdings('00000000-0000-0000-0000-0000000de5a3', '11111111-0000-0000-0000-0000000de5c3')::text);
select pg_temp.check(pg_temp.holds_all('00000000-0000-0000-0000-0000000de5a5', '11111111-0000-0000-0000-0000000de5c5')
    and pg_temp.holds_all('00000000-0000-0000-0000-0000000de5a6', '11111111-0000-0000-0000-0000000de5c6')
    and pg_temp.holds_all('00000000-0000-0000-0000-0000000de5a7', '11111111-0000-0000-0000-0000000de5c7'),
  'the refused phone, editor and map owner keep everything');
select pg_temp.check((select count(*) = 0 from public.contribution where unlinked
    and id <> '11111111-0000-0000-0000-0000000de5c4'),
  'no refused call unlinked a ride');
select pg_temp.check((select count(*) = 0 from auth.users where id = '00000000-0000-0000-0000-0000000de5a4')
    and (select count(*) = 0 from public.contributor where id = '00000000-0000-0000-0000-0000000de5a4')
    and (select count(*) = 0 from private.contributor_retired_totals where contributor_id = '00000000-0000-0000-0000-0000000de5a4')
    and (select count(*) = 0 from public.gps_session where owner_id = '00000000-0000-0000-0000-0000000de5a4'),
  'with false the person is gone');
select pg_temp.check((select contributor_id is null and unlinked
    and start_name is null and end_name is null and description is null
    from public.contribution where id = '11111111-0000-0000-0000-0000000de5c4')
    and (select count(*) = 1 from public.point_batch where contribution_id = '11111111-0000-0000-0000-0000000de5c4')
    and (select count(*) = 1 from public.hinto where contribution_id = '11111111-0000-0000-0000-0000000de5c4')
    and (select count(*) = 1 from public.contribution_use where contribution_id = '11111111-0000-0000-0000-0000000de5c4'),
  'with false the upload stays, unlinked and marked, its typed words cleared, with its points, hinto and use');

rollback;

-- Part two: read-only.
select * from (values
  (1, 'delete_my_account(boolean): a definer with a pinned path, for authenticated only, defaulting to true',
   (select prosecdef and proconfig @> array['search_path=""']
      and has_function_privilege('authenticated', oid, 'execute')
      and not has_function_privilege('anon', oid, 'execute')
      and not has_function_privilege('public', oid, 'execute')
      and pronargdefaults = 1 and pg_get_expr(proargdefaults, 0) = 'true'
      from pg_proc where oid = 'public.delete_my_account(boolean)'::regprocedure)),
  (2, 'no other delete_my_account beside it',
   (select count(*) = 1 from pg_proc where proname = 'delete_my_account'
      and pronamespace = 'public'::regnamespace)),
  (3, 'it refuses anything but false before it locks anything',
   (select position('if delete_uploads is distinct from false then' in prosrc) > 0
      and position('if delete_uploads is distinct from false then' in prosrc) < position('for update' in prosrc)
      from pg_proc where oid = 'public.delete_my_account(boolean)'::regprocedure)),
  (4, 'with false it still unlinks the uploads before the person goes',
   (select position('unlinked = true' in prosrc) > 0
      and position('unlinked = true' in prosrc) < position('delete from auth.users' in prosrc)
      from pg_proc where oid = 'public.delete_my_account(boolean)'::regprocedure)),
  (5, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'delete_account_refuse_uploads'))
) as c(n, what, ok) order by n;
