-- Para applies 20261115150000_longer_contributions.sql to the live project in one run.
--
-- Paste this whole file into the SQL editor (role postgres) and run it once. It is one
-- transaction. It checks the project first, applies
-- supabase/migrations/20261115150000_longer_contributions.sql (copied below unchanged), checks the
-- result, and writes the ledger row. If any check fails it raises, and nothing at all is changed,
-- the ledger included. A second run stops at step 1 and changes nothing. The check afterwards is
-- 20261115150000_longer_contributions_check.sql, and the undo is
-- 20261115150000_longer_contributions_revert.sql.
--
-- It changes one check on public.contribution and no grant or row. Every app now running keeps
-- working, because an app that stops at 6 hours sends nothing the new check refuses.

begin;

-- 1. Before anything changes, the contribution table exists and this has not run.
do $$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'longer_contributions') then
    raise exception 'longer_contributions: already applied. Nothing was changed.';
  end if;
  if to_regclass('public.contribution') is null then
    raise exception 'longer_contributions: 20261019125900_contributions is not applied here. Nothing was changed.';
  end if;
end $$;

-- >>> supabase/migrations/20261115150000_longer_contributions.sql, unchanged
-- Para lets a contribution last up to 24 hours, up from 6.
--
-- A community walk runs from morning to night, and a phone that recorded the
-- whole day held a ride the database refused. That ride stayed on the phone
-- with no way up. With 24 hours, one recording is still one contribution. The
-- other caps stay as they are. A ride holds at most 14,400 points (the phone
-- thins a longer ride to fit), 500 events and 500 gaps, a line of 200,000
-- bytes, and hintos of at most 21,600 seconds (the phone already clamps a
-- longer stop to that).
--
-- Only the length check on public.contribution changes. Every row there now
-- is 6 hours or less, so the new check passes on all of them. Adding it reads
-- the table once under a short lock. The public map reads published files, so
-- commuters see nothing, and a phone saving at that moment waits for it.
--
-- It runs after 20261019125900_contributions, and its apply refuses without
-- it. The session that wrote it did not apply it. The owner applies it as
-- postgres from supabase/apply/20261115150000_longer_contributions_apply.sql
-- and then records the ledger version. It is safe to run twice. The undo is
-- supabase/apply/20261115150000_longer_contributions_revert.sql.

alter table public.contribution drop constraint if exists contribution_check;
alter table public.contribution add constraint contribution_check
  check (ended_at > started_at and ended_at <= started_at + interval '24 hours');
-- <<< supabase/migrations/20261115150000_longer_contributions.sql

-- 2. After the change, the table has exactly one length check, and it says 24 hours.
do $$
begin
  if (select count(*) from pg_constraint
      where conrelid = 'public.contribution'::regclass and contype = 'c'
        and pg_get_constraintdef(oid) like '%ended_at > started_at%') <> 1 then
    raise exception 'longer_contributions: the table does not hold exactly one length check. Nothing was changed.';
  end if;
  if not exists (select 1 from pg_constraint
      where conrelid = 'public.contribution'::regclass and conname = 'contribution_check'
        and pg_get_constraintdef(oid) like '%''24:00:00''::interval%') then
    raise exception 'longer_contributions: the length check is not 24 hours. Nothing was changed.';
  end if;
end $$;

-- 3. This writes the ledger row once.
insert into supabase_migrations.schema_migrations (version, name, statements)
select greatest(to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
                (select (max(version)::bigint + 1)::text from supabase_migrations.schema_migrations
                 where version ~ '^[0-9]{14}$')),
       'longer_contributions', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'longer_contributions');

commit;
