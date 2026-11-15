-- Para checks the longer_contributions migration after it is applied.
--
-- There are two parts. The first adds a test user and rides, proves the behaviour, and rolls every
-- one of them back. It raises a FAILED message that names the first wrong result, and nothing it
-- did remains. It proves that a ride of 10 hours and one of exactly 24 hours are kept, and that
-- one of 24 hours and a second, and one that ends before it starts, are refused. The second part
-- is read-only, with one row per check, and every ok should be t.

-- Part one checks the behaviour and rolls it back.
begin;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;

-- This makes a ride of the given length as the test user and says whether the table kept it.
create function pg_temp.kept(ride uuid, length interval) returns boolean language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '7e7e7e83-0000-0000-0000-0000000000a1', true);
  insert into public.contribution (id, contributor_id, format_version, rules_version, consent_version,
    started_at, ended_at, sent_at, distance_m, moving_s, standing_s, lost_s, point_count, events, gaps,
    start_name, end_name, description)
  values (ride, '7e7e7e83-0000-0000-0000-0000000000a1', 2, 3, 1, now() - interval '2 days',
    now() - interval '2 days' + length, now(), 100, 60, 10, 0, 0, '[]', '[]', 'UP Diliman', 'Guadalupe', '');
  return true;
exception when check_violation then
  return false;
end $$;

-- Ids start 7e7e7e83 so nothing live shares them.
insert into auth.users (id, is_anonymous) values ('7e7e7e83-0000-0000-0000-0000000000a1', false);
insert into public.contributor (id) values ('7e7e7e83-0000-0000-0000-0000000000a1');

select pg_temp.check(pg_temp.kept('7e7e7e83-0000-0000-0000-0000000000c1', interval '10 hours'),
  'a ride of 10 hours is kept');
select pg_temp.check(pg_temp.kept('7e7e7e83-0000-0000-0000-0000000000c2', interval '24 hours'),
  'a ride of exactly 24 hours is kept');
select pg_temp.check(not pg_temp.kept('7e7e7e83-0000-0000-0000-0000000000c3', interval '24 hours 1 second'),
  'a ride longer than 24 hours is refused');
select pg_temp.check(not pg_temp.kept('7e7e7e83-0000-0000-0000-0000000000c4', interval '-1 minute'),
  'a ride that ends before it starts is refused');

rollback;

-- Part two is read-only.
select * from (values
  (1, 'contribution_check allows up to 24 hours',
   (select count(*) = 1 from pg_constraint
      where conrelid = 'public.contribution'::regclass and conname = 'contribution_check'
        and pg_get_constraintdef(oid) like '%''24:00:00''::interval%')),
  (2, 'no other check on contribution limits its length',
   (select count(*) = 1 from pg_constraint
      where conrelid = 'public.contribution'::regclass and contype = 'c'
        and pg_get_constraintdef(oid) like '%ended_at > started_at%')),
  (3, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'longer_contributions'))
) as c(n, what, ok) order by n;
