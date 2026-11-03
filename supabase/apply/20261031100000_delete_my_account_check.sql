-- ParaPo — checks after applying the delete_my_account migration.
--
-- Two parts. The first adds test users and their rows, proves the behaviour,
-- and rolls every one of them back: it raises "FAILED: ..." on the first wrong
-- result, and nothing it did remains. It proves:
--   - an account deletes itself and only itself. Every row of theirs goes,
--     counted by the ids taken before the delete: contributor, contributions,
--     point batches, hintos, contribution_use, retired totals, their own claim
--     tokens and gps_session rows. A token they used keeps claimed_by null.
--   - another account keeps everything.
--   - calling it again after the delete answers as deleted.
--   - anon cannot call it.
--   - an anonymous phone, an editor and an owner of a map row are refused and
--     keep everything.
--   - a former editor who hid an upload deletes themselves; the upload stays
--     hidden, with hidden_by null.
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

insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-0000000de1a1', false),
  ('00000000-0000-0000-0000-0000000de1a2', false),
  ('00000000-0000-0000-0000-0000000de1a3', true),
  ('00000000-0000-0000-0000-0000000de1a4', false),
  ('00000000-0000-0000-0000-0000000de1a5', false),
  ('00000000-0000-0000-0000-0000000de1a6', false),
  ('00000000-0000-0000-0000-0000000de1a7', true);
select pg_temp.fill('00000000-0000-0000-0000-0000000de1a1', '11111111-0000-0000-0000-0000000de1c1');
select pg_temp.fill('00000000-0000-0000-0000-0000000de1a2', '11111111-0000-0000-0000-0000000de1c2');
select pg_temp.fill('00000000-0000-0000-0000-0000000de1a3', '11111111-0000-0000-0000-0000000de1c3');
select pg_temp.fill('00000000-0000-0000-0000-0000000de1a4', '11111111-0000-0000-0000-0000000de1c4');
select pg_temp.fill('00000000-0000-0000-0000-0000000de1a5', '11111111-0000-0000-0000-0000000de1c5');
-- The first account: its own unused claim token, a token it used on another phone's anonymous
-- identity, and a row of the first recorder's.
insert into private.claim_token (anonymous_id) values ('00000000-0000-0000-0000-0000000de1a1');
insert into private.claim_token (anonymous_id, used_at, claimed_by)
  values ('00000000-0000-0000-0000-0000000de1a7', now(), '00000000-0000-0000-0000-0000000de1a1');
insert into public.gps_session (owner_id) values ('00000000-0000-0000-0000-0000000de1a1');
-- The fourth is an editor; the fifth still owns a route of the map.
insert into private.editor (user_id) values ('00000000-0000-0000-0000-0000000de1a4');
insert into public.route (owner_id, signboard, is_loop)
  values ('00000000-0000-0000-0000-0000000de1a5', 'zz delete_my_account check', true);
-- The sixth was an editor: it hid the second account's upload, then left the list.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000de1a6', false);
update public.contribution set hidden_at = now(), hidden_note = 'check'
  where id = '11111111-0000-0000-0000-0000000de1c2';
select pg_temp.check((select hidden_by = '00000000-0000-0000-0000-0000000de1a6' from public.contribution
  where id = '11111111-0000-0000-0000-0000000de1c2'), 'the former editor is the one who hid it');

select pg_temp.keep(id) from auth.users where id::text like '00000000-0000-0000-0000-0000000de1a_';
select pg_temp.check(pg_temp.holds_all('00000000-0000-0000-0000-0000000de1a1')
    and (pg_temp.holdings('00000000-0000-0000-0000-0000000de1a1') ->> 'gps_session')::integer = 1
    and (pg_temp.holdings('00000000-0000-0000-0000-0000000de1a1') ->> 'claim_token')::integer = 1,
  'the first account holds a row in every table to begin with');

-- anon reaches nothing.
set role anon;
do $$ begin perform public.delete_my_account(); raise exception 'FAILED: anon called delete_my_account';
exception when insufficient_privilege then null; end $$;
reset role;

set role authenticated;
-- No caller, an anonymous phone, an editor and an owner of map rows are refused, keeping everything.
select set_config('request.jwt.claim.sub', '', false);
do $$ begin perform public.delete_my_account(); raise exception 'FAILED: deleted with no caller';
exception when insufficient_privilege then null; end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000de1a3', false);
do $$ begin perform public.delete_my_account(); raise exception 'FAILED: an anonymous phone deleted itself';
exception when insufficient_privilege then
  if sqlerrm <> 'not_an_account' then raise exception 'FAILED: anonymous refused as %', sqlerrm; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000de1a4', false);
do $$ begin perform public.delete_my_account(); raise exception 'FAILED: an editor deleted itself';
exception when insufficient_privilege then
  if sqlerrm not like 'is_editor%' then raise exception 'FAILED: editor refused as %', sqlerrm; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000de1a5', false);
do $$ begin perform public.delete_my_account(); raise exception 'FAILED: an owner of map rows deleted itself';
exception when raise_exception then
  if sqlerrm not like 'owns_map_rows%' then raise exception 'FAILED: map owner refused as %', sqlerrm; end if;
end $$;

-- The first account deletes itself, and a retry after a lost answer is answered as deleted.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000de1a1', false);
select public.delete_my_account();
select public.delete_my_account();
-- The former editor deletes itself.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000de1a6', false);
select public.delete_my_account();
reset role;

select pg_temp.check(pg_temp.holds_nothing('00000000-0000-0000-0000-0000000de1a1'),
  'the deleted account holds nothing: ' || pg_temp.holdings('00000000-0000-0000-0000-0000000de1a1')::text);
select pg_temp.check((select claimed_by is null from private.claim_token
    where anonymous_id = '00000000-0000-0000-0000-0000000de1a7'),
  'the token it used on another identity stays, its claimed_by null');
select pg_temp.check(pg_temp.holds_all('00000000-0000-0000-0000-0000000de1a2'),
  'another account keeps everything: ' || pg_temp.holdings('00000000-0000-0000-0000-0000000de1a2')::text);
select pg_temp.check((select hidden_at is not null and hidden_by is null and hidden_note = 'check'
    from public.contribution where id = '11111111-0000-0000-0000-0000000de1c2'),
  'the upload the former editor hid stays hidden, its hidden_by null');
select pg_temp.check((select count(*) = 0 from auth.users where id = '00000000-0000-0000-0000-0000000de1a6'),
  'the former editor is gone');
select pg_temp.check(pg_temp.holds_all('00000000-0000-0000-0000-0000000de1a3')
    and pg_temp.holds_all('00000000-0000-0000-0000-0000000de1a4')
    and pg_temp.holds_all('00000000-0000-0000-0000-0000000de1a5'),
  'the refused phone, editor and map owner keep everything');
select pg_temp.check((select count(*) = 1 from public.route
    where owner_id = '00000000-0000-0000-0000-0000000de1a5'),
  'the map owner''s route is still there');

-- Who hid an upload still cannot be changed by anyone else while that user exists.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000de1a4', false);
update public.contribution set hidden_at = now(), hidden_note = 'by the editor'
  where id = '11111111-0000-0000-0000-0000000de1c3';
reset role;
-- Past the column grants (as the owner), the trigger alone still keeps it.
update public.contribution set hidden_by = null where id = '11111111-0000-0000-0000-0000000de1c3';
select pg_temp.check((select hidden_by = '00000000-0000-0000-0000-0000000de1a4' from public.contribution
    where id = '11111111-0000-0000-0000-0000000de1c3'),
  'an editor cannot clear who hid an upload while that user exists');

rollback;

-- Part two: read-only.
select * from (values
  (1, 'delete_my_account: a definer with a pinned path, for authenticated only',
   (select prosecdef and proconfig @> array['search_path=""']
      and has_function_privilege('authenticated', oid, 'execute')
      and not has_function_privilege('anon', oid, 'execute')
      and not has_function_privilege('public', oid, 'execute')
      from pg_proc where oid = 'public.delete_my_account()'::regprocedure)),
  (2, 'its owner may delete auth users',
   (select has_table_privilege(proowner::regrole::text, 'auth.users', 'delete')
      from pg_proc where oid = 'public.delete_my_account()'::regprocedure)),
  (3, 'every row of a contributor goes with their user: the cascades are there',
   (select count(*) = 6 from pg_constraint where contype = 'f' and confdeltype = 'c' and (conrelid, confrelid) in (
      ('public.contributor'::regclass, 'auth.users'::regclass),
      ('public.contribution'::regclass, 'public.contributor'::regclass),
      ('public.point_batch'::regclass, 'public.contribution'::regclass),
      ('public.hinto'::regclass, 'public.contribution'::regclass),
      ('public.contribution_use'::regclass, 'public.contribution'::regclass),
      ('private.contributor_retired_totals'::regclass, 'public.contributor'::regclass)))),
  (4, 'the hide stamp lets hidden_by go to null once its user is gone',
   (select position('exists (select 1 from auth.users where id = old.hidden_by)' in prosrc) > 0
      from pg_proc where oid = 'private.contribution_hide_stamp()'::regprocedure)),
  (5, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'delete_my_account'))
) as c(n, what, ok) order by n;
