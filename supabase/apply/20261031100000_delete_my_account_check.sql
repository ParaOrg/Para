-- ParaPo — checks after applying the delete_my_account migration.
--
-- Two parts. The first adds test users and their rows, proves the behaviour,
-- and rolls every one of them back: it raises "FAILED: ..." on the first wrong
-- result, and nothing it did remains. It proves that an account deletes itself
-- and only itself, and that every row of theirs goes with it (contributor,
-- contributions, point batches, hintos, contribution_use, retired totals,
-- claim tokens) while another account's stay; that anon cannot call it; that an
-- anonymous phone and an editor are refused and keep everything; and that an
-- account still owning a row of the map is refused and keeps everything.
-- The second part is read-only: one row per check, every ok should be t.

-- Part one: the behaviour, rolled back.
begin;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;
grant execute on function pg_temp.check(boolean, text) to anon, authenticated;

-- What a user holds anywhere, by table: the counts the deletes must bring to 0.
create function pg_temp.holdings(who uuid) returns jsonb language sql as $$
  select jsonb_build_object(
    'user', (select count(*) from auth.users where id = who),
    'contributor', (select count(*) from public.contributor where id = who),
    'contribution', (select count(*) from public.contribution where contributor_id = who),
    'point_batch', (select count(*) from public.point_batch p
      join public.contribution c on c.id = p.contribution_id where c.contributor_id = who),
    'hinto', (select count(*) from public.hinto h
      join public.contribution c on c.id = h.contribution_id where c.contributor_id = who),
    'contribution_use', (select count(*) from public.contribution_use u
      join public.contribution c on c.id = u.contribution_id where c.contributor_id = who),
    'retired_totals', (select count(*) from private.contributor_retired_totals where contributor_id = who),
    'claim_token', (select count(*) from private.claim_token where anonymous_id = who)
  );
$$;
create function pg_temp.holds_nothing(who uuid) returns boolean language sql as $$
  select bool_and(value::integer = 0) from jsonb_each_text(pg_temp.holdings(who));
$$;
create function pg_temp.holds_all(who uuid) returns boolean language sql as $$
  select bool_and(value::integer > 0) from jsonb_each_text(pg_temp.holdings(who))
    where key not in ('claim_token');
$$;

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

insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-0000000de1a1', false),
  ('00000000-0000-0000-0000-0000000de1a2', false),
  ('00000000-0000-0000-0000-0000000de1a3', true),
  ('00000000-0000-0000-0000-0000000de1a4', false),
  ('00000000-0000-0000-0000-0000000de1a5', false);
select pg_temp.fill('00000000-0000-0000-0000-0000000de1a1', '11111111-0000-0000-0000-0000000de1c1');
select pg_temp.fill('00000000-0000-0000-0000-0000000de1a2', '11111111-0000-0000-0000-0000000de1c2');
select pg_temp.fill('00000000-0000-0000-0000-0000000de1a3', '11111111-0000-0000-0000-0000000de1c3');
select pg_temp.fill('00000000-0000-0000-0000-0000000de1a4', '11111111-0000-0000-0000-0000000de1c4');
select pg_temp.fill('00000000-0000-0000-0000-0000000de1a5', '11111111-0000-0000-0000-0000000de1c5');
-- The first account's own unused claim token, as an earlier anonymous phone of its would hold.
insert into private.claim_token (anonymous_id) values ('00000000-0000-0000-0000-0000000de1a1');
-- The fourth is an editor; the fifth still owns a route of the map.
insert into private.editor (user_id) values ('00000000-0000-0000-0000-0000000de1a4');
insert into public.route (owner_id, signboard, is_loop)
  values ('00000000-0000-0000-0000-0000000de1a5', 'zz delete_my_account check', true);
select pg_temp.check(pg_temp.holds_all('00000000-0000-0000-0000-0000000de1a1'),
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

-- The first account deletes itself.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000de1a1', false);
select public.delete_my_account();
reset role;

select pg_temp.check(pg_temp.holds_nothing('00000000-0000-0000-0000-0000000de1a1'),
  'the deleted account holds nothing: ' || pg_temp.holdings('00000000-0000-0000-0000-0000000de1a1')::text);
select pg_temp.check(pg_temp.holds_all('00000000-0000-0000-0000-0000000de1a2'),
  'another account keeps everything: ' || pg_temp.holdings('00000000-0000-0000-0000-0000000de1a2')::text);
select pg_temp.check(pg_temp.holds_all('00000000-0000-0000-0000-0000000de1a3')
    and pg_temp.holds_all('00000000-0000-0000-0000-0000000de1a4')
    and pg_temp.holds_all('00000000-0000-0000-0000-0000000de1a5'),
  'the refused phone, editor and map owner keep everything');
select pg_temp.check((select count(*) = 1 from public.route
    where owner_id = '00000000-0000-0000-0000-0000000de1a5'),
  'the map owner''s route is still there');

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
   (select count(*) = 5 from pg_constraint where contype = 'f' and confdeltype = 'c' and (conrelid, confrelid) in (
      ('public.contributor'::regclass, 'auth.users'::regclass),
      ('public.contribution'::regclass, 'public.contributor'::regclass),
      ('public.hinto'::regclass, 'public.contribution'::regclass),
      ('public.contribution_use'::regclass, 'public.contribution'::regclass),
      ('private.contributor_retired_totals'::regclass, 'public.contributor'::regclass)))),
  (4, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'delete_my_account'))
) as c(n, what, ok) order by n;
