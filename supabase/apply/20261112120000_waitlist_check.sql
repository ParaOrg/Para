-- Para — checks after applying the waitlist migration.
--
-- Two parts. The first adds two test emails, proves the behaviour, and rolls them back: it raises
-- "FAILED: ..." on the first wrong result, and nothing it did remains. It proves that a browser
-- (anon) and a signed-in phone (authenticated) can neither read nor add to the list, that the
-- function's role adds an email once and a second time changes nothing, and that the table refuses
-- an email in capitals, one with a space and one with no dot. The second part is read-only: one row
-- per check, every ok should be t.

-- Part one: the behaviour, rolled back.
begin;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; end $$;
grant execute on function pg_temp.check(boolean, text) to anon, authenticated, service_role;
-- Runs `statement` as the caller and passes only when it is refused with `condition`.
create function pg_temp.refused(statement text, condition text) returns boolean language plpgsql as $$
begin
  execute statement;
  raise exception 'FAILED: this ran: %', statement;
exception when others then
  if sqlstate = condition then return true; end if;
  raise;
end $$;
grant execute on function pg_temp.refused(text, text) to anon, authenticated, service_role;

-- Addresses end .invalid, which no one can hold, so nothing live shares them.
set local role service_role;
insert into public.waitlist (email) values ('first@waitlist-check.invalid');
with again as (
  insert into public.waitlist (email) values ('first@waitlist-check.invalid')
  on conflict (email) do nothing returning email
)
select pg_temp.check((select count(*) = 0 from again), 'the same email twice adds no second row');
select pg_temp.check((select count(*) = 1 from public.waitlist where email like '%@waitlist-check.invalid'),
  'the function''s role adds an email and reads it back');
select pg_temp.check(pg_temp.refused($q$insert into public.waitlist (email) values ('Caps@waitlist-check.invalid')$q$, '23514'),
  'an email in capitals is refused');
select pg_temp.check(pg_temp.refused($q$insert into public.waitlist (email) values ('a b@waitlist-check.invalid')$q$, '23514'),
  'an email with a space is refused');
select pg_temp.check(pg_temp.refused($q$insert into public.waitlist (email) values ('nodot@invalid')$q$, '23514'),
  'an email with no dot after the @ is refused');
select pg_temp.check(pg_temp.refused($q$delete from public.waitlist$q$, '42501'),
  'the function''s role cannot empty the list');
select pg_temp.check(pg_temp.refused($q$truncate public.waitlist$q$, '42501'),
  'the function''s role cannot truncate the list');
select pg_temp.check(pg_temp.refused($q$update public.waitlist set email = email$q$, '42501'),
  'the function''s role cannot change an email');

set local role anon;
select pg_temp.check(pg_temp.refused($q$select count(*) from public.waitlist$q$, '42501'), 'anon cannot read the list');
select pg_temp.check(pg_temp.refused($q$insert into public.waitlist (email) values ('anon@waitlist-check.invalid')$q$, '42501'),
  'anon cannot add to the list');
set local role authenticated;
select pg_temp.check(pg_temp.refused($q$select count(*) from public.waitlist$q$, '42501'), 'a signed-in phone cannot read the list');
select pg_temp.check(pg_temp.refused($q$insert into public.waitlist (email) values ('phone@waitlist-check.invalid')$q$, '42501'),
  'a signed-in phone cannot add to the list');
reset role;
rollback;

-- Part two: read-only.
select * from (values
  (1, 'anon and authenticated hold nothing on the list',
   (select bool_and(not has_table_privilege(r, 'public.waitlist', 'select, insert, update, delete')
                    and not has_any_column_privilege(r, 'public.waitlist', 'select, insert, update'))
      from unnest(array['anon', 'authenticated']) r)),
  (2, 'row security is on, with no rule',
   (select relrowsecurity from pg_class where oid = 'public.waitlist'::regclass)
   and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'waitlist')),
  (3, 'service_role selects and inserts, and does not update, delete or truncate',
   has_table_privilege('service_role', 'public.waitlist', 'select')
   and has_table_privilege('service_role', 'public.waitlist', 'insert')
   and not has_table_privilege('service_role', 'public.waitlist', 'update, delete, truncate')),
  (4, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'waitlist'))
) as c(n, what, ok) order by n;
