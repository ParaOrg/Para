-- ParaPo — checks after applying the delete_account_keep_uploads migration.
--
-- Two parts. The first adds test users and their rows, proves the behaviour,
-- and rolls every one of them back: it raises "FAILED: ..." on the first wrong
-- result, and nothing it did remains. It proves:
--   - with no argument (the app already on phones) an account deletes itself
--     and every upload, as before: every row of theirs goes, counted by the ids
--     taken before the delete. A token they used keeps claimed_by null.
--   - delete_uploads => true does the same.
--   - delete_uploads => false deletes the person (user, contributor row with its
--     name and number, retired totals, claim tokens, gps_session) and keeps the
--     uploads: the contribution, its point batch, hinto and use stay, unlinked
--     (contributor_id null, unlinked_at set), and no row names the person.
--   - a retry after a lost answer is answered as deleted, either way.
--   - another account keeps everything.
--   - anon cannot call it; no caller, an anonymous phone, an editor and an owner
--     of a map row are refused, with either answer, and keep everything.
--   - a former editor who hid an upload deletes itself; the upload stays hidden,
--     with hidden_by null.
--   - retire_month retires a kept ride (its words cleared, unlinked_at cleared)
--     and a second run skips it.
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
end $$;

-- What a user holds anywhere, counted by the rows it had before (`kept`), so a leftover shows.
create temp table kept (who uuid, what text, key text);
create function pg_temp.keep(who uuid) returns void language sql as $$
  insert into kept
  select who, 'contribution', c.id::text from public.contribution c where c.contributor_id = who
  union all select who, 'point_batch', p.contribution_id || '/' || p.seq || '/' || p.month
    from public.point_batch p join public.contribution c on c.id = p.contribution_id where c.contributor_id = who
  union all select who, 'hinto', h.contribution_id || '/' || h.seq
    from public.hinto h join public.contribution c on c.id = h.contribution_id where c.contributor_id = who
  union all select who, 'contribution_use', u.id::text
    from public.contribution_use u join public.contribution c on c.id = u.contribution_id where c.contributor_id = who;
$$;
create function pg_temp.holdings(who uuid) returns jsonb language sql as $$
  select jsonb_build_object(
    'user', (select count(*) from auth.users where id = who),
    'contributor', (select count(*) from public.contributor where id = who),
    'contribution', (select count(*) from kept k join public.contribution c on c.id::text = k.key
      where k.who = holdings.who and k.what = 'contribution'),
    'point_batch', (select count(*) from kept k join public.point_batch p
      on p.contribution_id || '/' || p.seq || '/' || p.month = k.key where k.who = holdings.who and k.what = 'point_batch'),
    'hinto', (select count(*) from kept k join public.hinto h
      on h.contribution_id || '/' || h.seq = k.key where k.who = holdings.who and k.what = 'hinto'),
    'contribution_use', (select count(*) from kept k join public.contribution_use u
      on u.id::text = k.key where k.who = holdings.who and k.what = 'contribution_use'),
    'retired_totals', (select count(*) from private.contributor_retired_totals where contributor_id = who),
    'claim_token', (select count(*) from private.claim_token where anonymous_id = who),
    'gps_session', (select count(*) from public.gps_session where owner_id = who)
  );
$$;
create function pg_temp.holds_nothing(who uuid) returns boolean language sql as $$
  select bool_and(value::integer = 0) from jsonb_each_text(pg_temp.holdings(who));
$$;
create function pg_temp.holds_all(who uuid) returns boolean language sql as $$
  select bool_and(value::integer > 0) from jsonb_each_text(pg_temp.holdings(who))
    where key not in ('claim_token', 'gps_session');
$$;
-- The person gone, their uploads kept: the rows of theirs counted before, and nothing of them.
create function pg_temp.kept_uploads_only(who uuid) returns boolean language sql as $$
  select bool_and(case when key in ('contribution', 'point_batch', 'hinto', 'contribution_use')
                       then value::integer > 0 else value::integer = 0 end)
  from jsonb_each_text(pg_temp.holdings(who));
$$;
-- Any row anywhere that still names the user.
create function pg_temp.named_anywhere(who uuid) returns integer language sql as $$
  select ((select count(*) from auth.users where id = who)
    + (select count(*) from public.contributor where id = who or blocked_by = who)
    + (select count(*) from public.contribution where contributor_id = who or hidden_by = who)
    + (select count(*) from public.contribution_use where editor_id = who)
    + (select count(*) from private.claim_token where anonymous_id = who or claimed_by = who)
    + (select count(*) from private.contributor_retired_totals where contributor_id = who)
    + (select count(*) from public.gps_session where owner_id = who))::integer;
$$;

insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-0000000de2a1', false),
  ('00000000-0000-0000-0000-0000000de2a2', false),
  ('00000000-0000-0000-0000-0000000de2a3', true),
  ('00000000-0000-0000-0000-0000000de2a4', false),
  ('00000000-0000-0000-0000-0000000de2a5', false),
  ('00000000-0000-0000-0000-0000000de2a6', false),
  ('00000000-0000-0000-0000-0000000de2a7', true),
  ('00000000-0000-0000-0000-0000000de2a8', false),
  ('00000000-0000-0000-0000-0000000de2a9', false);
select pg_temp.fill('00000000-0000-0000-0000-0000000de2a1', '11111111-0000-0000-0000-0000000de2c1');
select pg_temp.fill('00000000-0000-0000-0000-0000000de2a2', '11111111-0000-0000-0000-0000000de2c2');
select pg_temp.fill('00000000-0000-0000-0000-0000000de2a3', '11111111-0000-0000-0000-0000000de2c3');
select pg_temp.fill('00000000-0000-0000-0000-0000000de2a4', '11111111-0000-0000-0000-0000000de2c4');
select pg_temp.fill('00000000-0000-0000-0000-0000000de2a5', '11111111-0000-0000-0000-0000000de2c5');
select pg_temp.fill('00000000-0000-0000-0000-0000000de2a8', '11111111-0000-0000-0000-0000000de2c8');
select pg_temp.fill('00000000-0000-0000-0000-0000000de2a9', '11111111-0000-0000-0000-0000000de2c9');
-- The first account (no argument): its own unused claim token, a token it used on another
-- phone's anonymous identity, and a row of the first recorder's.
insert into private.claim_token (anonymous_id) values ('00000000-0000-0000-0000-0000000de2a1');
insert into private.claim_token (anonymous_id, used_at, claimed_by)
  values ('00000000-0000-0000-0000-0000000de2a7', now(), '00000000-0000-0000-0000-0000000de2a1');
insert into public.gps_session (owner_id) values ('00000000-0000-0000-0000-0000000de2a1');
-- The eighth (keeps its uploads): the same, a name and a number, words on its ride, and the
-- editor's use of the ride.
insert into private.claim_token (anonymous_id) values ('00000000-0000-0000-0000-0000000de2a8');
insert into private.claim_token (anonymous_id, used_at, claimed_by)
  values ('00000000-0000-0000-0000-0000000de2a3', now(), '00000000-0000-0000-0000-0000000de2a8');
insert into public.gps_session (owner_id) values ('00000000-0000-0000-0000-0000000de2a8');
update public.contributor set name = 'Check Person', phone = '+639170000000'
  where id = '00000000-0000-0000-0000-0000000de2a8';
update public.contribution set start_name = 'Cubao', end_name = 'Quiapo', description = 'check words',
    line = '{"type":"LineString","coordinates":[[121.0,14.6],[121.002,14.6],[121.004,14.6],[121.006,14.6],[121.008,14.6],[121.01,14.6]]}'
  where id = '11111111-0000-0000-0000-0000000de2c8';
update public.contribution_use set editor_id = '00000000-0000-0000-0000-0000000de2a4'
  where contribution_id = '11111111-0000-0000-0000-0000000de2c8';
-- The fourth is an editor; the fifth still owns a route of the map.
insert into private.editor (user_id) values ('00000000-0000-0000-0000-0000000de2a4');
insert into public.route (owner_id, signboard, is_loop)
  values ('00000000-0000-0000-0000-0000000de2a5', 'zz delete_account_keep_uploads check', true);
-- The sixth was an editor: it hid the second account's upload, then left the list.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000de2a6', false);
update public.contribution set hidden_at = now(), hidden_note = 'check'
  where id = '11111111-0000-0000-0000-0000000de2c2';
select pg_temp.check((select hidden_by = '00000000-0000-0000-0000-0000000de2a6' from public.contribution
  where id = '11111111-0000-0000-0000-0000000de2c2'), 'the former editor is the one who hid it');

select pg_temp.keep(id) from auth.users where id::text like '00000000-0000-0000-0000-0000000de2a_';
select pg_temp.check(pg_temp.holds_all('00000000-0000-0000-0000-0000000de2a1')
    and (pg_temp.holdings('00000000-0000-0000-0000-0000000de2a1') ->> 'gps_session')::integer = 1
    and (pg_temp.holdings('00000000-0000-0000-0000-0000000de2a1') ->> 'claim_token')::integer = 1
    and pg_temp.holds_all('00000000-0000-0000-0000-0000000de2a8')
    and (pg_temp.holdings('00000000-0000-0000-0000-0000000de2a8') ->> 'gps_session')::integer = 1
    and (pg_temp.holdings('00000000-0000-0000-0000-0000000de2a8') ->> 'claim_token')::integer = 1,
  'the first and eighth accounts hold a row in every table to begin with');

-- anon reaches nothing.
set role anon;
do $$ begin perform public.delete_my_account(); raise exception 'FAILED: anon called delete_my_account';
exception when insufficient_privilege then null; end $$;
do $$ begin perform public.delete_my_account(false); raise exception 'FAILED: anon called delete_my_account(false)';
exception when insufficient_privilege then null; end $$;
reset role;

set role authenticated;
-- No caller, an anonymous phone, an editor and an owner of map rows are refused with either answer,
-- keeping everything.
select set_config('request.jwt.claim.sub', '', false);
do $$ begin perform public.delete_my_account(false); raise exception 'FAILED: deleted with no caller';
exception when insufficient_privilege then null; end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000de2a3', false);
do $$ begin perform public.delete_my_account(false); raise exception 'FAILED: an anonymous phone deleted itself';
exception when insufficient_privilege then
  if sqlerrm <> 'not_an_account' then raise exception 'FAILED: anonymous refused as %', sqlerrm; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000de2a4', false);
do $$ begin perform public.delete_my_account(delete_uploads => false); raise exception 'FAILED: an editor deleted itself';
exception when insufficient_privilege then
  if sqlerrm not like 'is_editor%' then raise exception 'FAILED: editor refused as %', sqlerrm; end if;
end $$;
do $$ begin perform public.delete_my_account(); raise exception 'FAILED: an editor deleted itself';
exception when insufficient_privilege then
  if sqlerrm not like 'is_editor%' then raise exception 'FAILED: editor refused as %', sqlerrm; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000de2a5', false);
do $$ begin perform public.delete_my_account(false); raise exception 'FAILED: an owner of map rows deleted itself';
exception when raise_exception then
  if sqlerrm not like 'owns_map_rows%' then raise exception 'FAILED: map owner refused as %', sqlerrm; end if;
end $$;

-- The first account deletes itself with no argument, as the app on phones calls it; a retry is
-- answered as deleted.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000de2a1', false);
select public.delete_my_account();
select public.delete_my_account();
-- The ninth says yes to deleting its uploads.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000de2a9', false);
select public.delete_my_account(delete_uploads => true);
-- The eighth keeps its uploads; a retry is answered as deleted.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000de2a8', false);
select public.delete_my_account(delete_uploads => false);
select public.delete_my_account(delete_uploads => false);
-- The former editor deletes itself.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000de2a6', false);
select public.delete_my_account();
reset role;

select pg_temp.check(pg_temp.holds_nothing('00000000-0000-0000-0000-0000000de2a1'),
  'with no argument the account and every upload are gone: ' || pg_temp.holdings('00000000-0000-0000-0000-0000000de2a1')::text);
select pg_temp.check((select claimed_by is null from private.claim_token
    where anonymous_id = '00000000-0000-0000-0000-0000000de2a7'),
  'the token it used on another identity stays, its claimed_by null');
select pg_temp.check(pg_temp.holds_nothing('00000000-0000-0000-0000-0000000de2a9'),
  'with true the account and every upload are gone: ' || pg_temp.holdings('00000000-0000-0000-0000-0000000de2a9')::text);
select pg_temp.check(pg_temp.kept_uploads_only('00000000-0000-0000-0000-0000000de2a8'),
  'with false the person is gone and the uploads stay: ' || pg_temp.holdings('00000000-0000-0000-0000-0000000de2a8')::text);
select pg_temp.check(pg_temp.named_anywhere('00000000-0000-0000-0000-0000000de2a8') = 0,
  'no row names the person who kept their uploads');
select pg_temp.check((select contributor_id is null and unlinked_at is not null and start_name = 'Cubao'
    from public.contribution where id = '11111111-0000-0000-0000-0000000de2c8'),
  'the kept upload is unlinked and stamped, its words still with it');
select pg_temp.check((select editor_id = '00000000-0000-0000-0000-0000000de2a4' from public.contribution_use
    where contribution_id = '11111111-0000-0000-0000-0000000de2c8'),
  'the editor''s use of the kept upload stays the editor''s');
select pg_temp.check((select claimed_by is null from private.claim_token
    where anonymous_id = '00000000-0000-0000-0000-0000000de2a3'),
  'the token the eighth used on another identity stays, its claimed_by null');
select pg_temp.check((select count(*) = 0 from public.contribution where unlinked_at is not null
    and id <> '11111111-0000-0000-0000-0000000de2c8'),
  'only the kept upload is stamped');
select pg_temp.check(pg_temp.holds_all('00000000-0000-0000-0000-0000000de2a2'),
  'another account keeps everything: ' || pg_temp.holdings('00000000-0000-0000-0000-0000000de2a2')::text);
select pg_temp.check((select hidden_at is not null and hidden_by is null and hidden_note = 'check'
    from public.contribution where id = '11111111-0000-0000-0000-0000000de2c2'),
  'the upload the former editor hid stays hidden, its hidden_by null');
select pg_temp.check((select count(*) = 0 from auth.users where id = '00000000-0000-0000-0000-0000000de2a6'),
  'the former editor is gone');
select pg_temp.check(pg_temp.holds_all('00000000-0000-0000-0000-0000000de2a3')
    and pg_temp.holds_all('00000000-0000-0000-0000-0000000de2a4')
    and pg_temp.holds_all('00000000-0000-0000-0000-0000000de2a5'),
  'the refused phone, editor and map owner keep everything');

-- Retiring: the kept ride, moved to an old month, is retired like any other, then skipped.
update public.contribution set received_at = timestamptz '2024-05-15 12:00+00'
  where id = '11111111-0000-0000-0000-0000000de2c8';
select pg_temp.check((select (r ->> 'contributions')::integer = 1
  from (select private.retire_month(date '2024-05-01', 0) r) x), 'the month retires the kept ride');
select pg_temp.check((select contributor_id is null and unlinked_at is null
    and start_name is null and end_name is null and description is null
    and line -> 'coordinates' -> 0 <> '[121.0, 14.6]'::jsonb
    from public.contribution where id = '11111111-0000-0000-0000-0000000de2c8'),
  'the kept ride is retired: words cleared, ends cut, unlinked_at cleared');
select pg_temp.check((select (r ->> 'contributions')::integer = 0
  from (select private.retire_month(date '2024-05-01', 0) r) x), 'a second run skips it');

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
  (2, 'no zero-argument delete_my_account beside it',
   (select count(*) = 1 from pg_proc where proname = 'delete_my_account'
      and pronamespace = 'public'::regnamespace)),
  (3, 'its owner may delete auth users',
   (select has_table_privilege(proowner::regrole::text, 'auth.users', 'delete')
      from pg_proc where oid = 'public.delete_my_account(boolean)'::regprocedure)),
  (4, 'contribution.unlinked_at is there, and no one but the database writes it',
   (select count(*) = 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'contribution' and column_name = 'unlinked_at')
   and not has_column_privilege('authenticated', 'public.contribution', 'unlinked_at', 'update')
   and not has_column_privilege('anon', 'public.contribution', 'unlinked_at', 'update')),
  (5, 'retire_month takes a kept ride and clears its mark',
   (select position('unlinked_at is not null' in prosrc) > 0 and position('unlinked_at = null' in prosrc) > 0
      from pg_proc where oid = 'private.retire_month(date, integer)'::regprocedure)),
  (6, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'delete_account_keep_uploads'))
) as c(n, what, ok) order by n;
