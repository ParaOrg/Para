-- ParaPo — checks after applying the keep_uploads_on_user_delete migration.
--
-- Two parts. The first adds test users with a ride each (its point batch, hinto and use), deletes
-- them the ways a user can go, and rolls every one of them back: it raises "FAILED: ..." on the
-- first wrong result, and nothing it did remains. It proves:
--   - deleting an account's user directly (the dashboard, a script) keeps its ride, unlinked and
--     marked, the typed words cleared, with its point batch, hinto and use; the person's own rows
--     (contributor, retired totals) go;
--   - the same for an anonymous phone's user (an anonymous clean-up);
--   - the same for a contributor row deleted directly, and the user stays;
--   - delete_my_account(delete_uploads => false) leaves exactly what it left before;
--   - a claim still moves a phone's rides to the account, linked, and deleting the phone's user
--     afterwards touches none of them.
-- The second part is read-only: one row per check, every ok should be t.

-- Part one: the behaviour, rolled back.
begin;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;
grant execute on function pg_temp.check(boolean, text) to authenticated;

-- An account with one ride and one of everything a ride holds, with typed words.
-- contribution_stamp names a ride's owner from the caller, so the ride is made as `who`.
create function pg_temp.fill(who uuid, ride uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', who::text, true);
  insert into public.contributor (id) values (who) on conflict do nothing;
  insert into public.contribution (id, contributor_id, format_version, rules_version, consent_version,
    started_at, ended_at, sent_at, distance_m, moving_s, standing_s, lost_s, point_count, events, gaps,
    start_name, end_name, description)
  values (ride, who, 2, 2, 1, now() - interval '2 hours', now() - interval '1 hour', now(),
    100, 60, 10, 0, 2, '[]', '[]', 'Cubao', 'Quiapo', 'check words');
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
-- The ride is kept whole and unlinked: no owner, marked, words cleared, its pieces there.
create function pg_temp.kept_unlinked(ride uuid) returns boolean language sql as $$
  select exists (select 1 from public.contribution c where c.id = ride and c.contributor_id is null
                   and c.unlinked and c.start_name is null and c.end_name is null and c.description is null)
     and exists (select 1 from public.point_batch where contribution_id = ride)
     and exists (select 1 from public.hinto where contribution_id = ride)
     and exists (select 1 from public.contribution_use where contribution_id = ride);
$$;
-- The person's own rows are gone.
create function pg_temp.person_gone(who uuid) returns boolean language sql as $$
  select not exists (select 1 from public.contributor where id = who)
     and not exists (select 1 from private.contributor_retired_totals where contributor_id = who);
$$;

-- Ids start 7e7e7e82 so nothing live shares them. a5 is an anonymous phone.
insert into auth.users (id, is_anonymous) values
  ('7e7e7e82-0000-0000-0000-0000000000a1', false), ('7e7e7e82-0000-0000-0000-0000000000a2', true),
  ('7e7e7e82-0000-0000-0000-0000000000a3', false), ('7e7e7e82-0000-0000-0000-0000000000a4', false),
  ('7e7e7e82-0000-0000-0000-0000000000a5', true), ('7e7e7e82-0000-0000-0000-0000000000a6', false);
select pg_temp.fill('7e7e7e82-0000-0000-0000-0000000000a1', '7e7e7e82-0000-0000-0000-0000000000c1');
select pg_temp.fill('7e7e7e82-0000-0000-0000-0000000000a2', '7e7e7e82-0000-0000-0000-0000000000c2');
select pg_temp.fill('7e7e7e82-0000-0000-0000-0000000000a3', '7e7e7e82-0000-0000-0000-0000000000c3');
select pg_temp.fill('7e7e7e82-0000-0000-0000-0000000000a4', '7e7e7e82-0000-0000-0000-0000000000c4');
select pg_temp.fill('7e7e7e82-0000-0000-0000-0000000000a5', '7e7e7e82-0000-0000-0000-0000000000c5');

-- An account's user deleted directly, as the dashboard does.
delete from auth.users where id = '7e7e7e82-0000-0000-0000-0000000000a1';
select pg_temp.check(pg_temp.kept_unlinked('7e7e7e82-0000-0000-0000-0000000000c1')
    and pg_temp.person_gone('7e7e7e82-0000-0000-0000-0000000000a1'),
  'deleting an account''s user keeps its ride unlinked, and the person''s own rows go');
-- An anonymous phone's user deleted, as an anonymous clean-up does.
delete from auth.users where id = '7e7e7e82-0000-0000-0000-0000000000a2';
select pg_temp.check(pg_temp.kept_unlinked('7e7e7e82-0000-0000-0000-0000000000c2')
    and pg_temp.person_gone('7e7e7e82-0000-0000-0000-0000000000a2'),
  'deleting an anonymous phone''s user keeps its ride unlinked');
-- A contributor row deleted directly: the user stays.
delete from public.contributor where id = '7e7e7e82-0000-0000-0000-0000000000a3';
select pg_temp.check(pg_temp.kept_unlinked('7e7e7e82-0000-0000-0000-0000000000c3')
    and exists (select 1 from auth.users where id = '7e7e7e82-0000-0000-0000-0000000000a3'),
  'deleting a contributor row keeps its ride unlinked, and the user');

-- delete_my_account(false): as before.
set role authenticated;
select set_config('request.jwt.claim.sub', '7e7e7e82-0000-0000-0000-0000000000a4', true);
select public.delete_my_account(false);
reset role;
select pg_temp.check(pg_temp.kept_unlinked('7e7e7e82-0000-0000-0000-0000000000c4')
    and pg_temp.person_gone('7e7e7e82-0000-0000-0000-0000000000a4')
    and not exists (select 1 from auth.users where id = '7e7e7e82-0000-0000-0000-0000000000a4'),
  'delete_my_account(false) deletes the person and keeps the ride unlinked, as before');

-- A claim: the phone's ride moves to the account, linked; deleting the phone's user then changes none of it.
create temporary table claim_token_held (token uuid);
grant all on claim_token_held to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e7e7e82-0000-0000-0000-0000000000a5', true);
insert into claim_token_held select public.begin_claim();
select set_config('request.jwt.claim.sub', '7e7e7e82-0000-0000-0000-0000000000a6', true);
select pg_temp.check(public.finish_claim((select token from claim_token_held)) = 1, 'the claim moves one ride');
reset role;
delete from auth.users where id = '7e7e7e82-0000-0000-0000-0000000000a5';
select pg_temp.check(exists (select 1 from public.contribution c where c.id = '7e7e7e82-0000-0000-0000-0000000000c5'
      and c.contributor_id = '7e7e7e82-0000-0000-0000-0000000000a6' and not c.unlinked and c.start_name = 'Cubao'),
  'a claimed ride stays the account''s, linked, after the phone''s user goes');

rollback;

-- Part two: read-only.
select * from (values
  (1, 'contributor_unlink_contributions: before delete, for each row, enabled',
   (select count(*) = 1 from pg_trigger
      where tgname = 'contributor_unlink_contributions' and tgrelid = 'public.contributor'::regclass
        and tgenabled = 'O' and tgtype & 1 = 1 and tgtype & 2 = 2 and tgtype & 8 = 8)),
  (2, 'private.unlink_contributions: security definer, pinned path, callable by no app role',
   (select p.prosecdef and p.proconfig @> array['search_path=""']
       and not has_function_privilege('authenticated', p.oid, 'execute')
       and not has_function_privilege('anon', p.oid, 'execute')
      from pg_proc p where p.oid = 'private.unlink_contributions()'::regprocedure)),
  (3, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'keep_uploads_on_user_delete'))
) as c(n, what, ok) order by n;
