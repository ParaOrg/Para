-- Para — apply 20261112120000_waitlist.sql to the live project, in one run.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it once. One transaction: it
-- checks the migration has not run, applies supabase/migrations/20261112120000_waitlist.sql (copied
-- below unchanged), checks the result, and writes the ledger row. If any check fails it raises,
-- and nothing at all is changed, ledger included. A second run stops at step 1 and changes nothing.
-- Afterwards: 20261112120000_waitlist_check.sql (it adds two test emails and rolls them back).
-- Undo: 20261112120000_waitlist_revert.sql.
--
-- Safe to apply at any time: it adds one table that nothing reads yet. The form on /app/ works
-- only once the waitlist Edge Function is deployed too (supabase/apply/README.md).

begin;

-- 1. Before: this has not run.
do $$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'waitlist') then
    raise exception 'waitlist: already applied. Nothing was changed.';
  end if;
end $$;

-- >>> supabase/migrations/20261112120000_waitlist.sql, unchanged
-- Para — waitlist: the emails of people who asked to be told when the iPhone
-- app is out
--
-- Gab asked for a waitlist on the landing page (meeting, 2026-11-03). /app/ has
-- an Android download and nothing to install on an iPhone, so its iPhone part
-- takes an email. This table keeps them, one row an email, until the app is
-- out and the one message is sent.
--
-- An email is kept trimmed and in lower case, so the same address written two
-- ways is one row. The check below is the only rule on its shape: something,
-- an @, something, a dot, something, no spaces, at most 254 characters.
--
-- Who may do what:
--   anon, authenticated   nothing: no grant, and row security is on with no
--                         rule. A phone or a browser holding the publishable
--                         key cannot read, add or count the list.
--   service_role          selects and inserts. Only the waitlist Edge Function
--                         (supabase/functions/waitlist) holds it, and it adds
--                         a row only after Cloudflare's bot check passes.
--   the owner             reads the list in the dashboard to send the message,
--                         and deletes a row when someone asks to be taken off.
--
-- Written, not applied: the owner applies it, as postgres, from
-- supabase/apply/20261112120000_waitlist_apply.sql, then records the ledger
-- version. Undo: supabase/apply/20261112120000_waitlist_revert.sql.

create table public.waitlist (
  email text primary key
    check (
      email = lower(email)
      and length(email) <= 254
      and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    ),
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- service_role is named too: on the live project a new table in public is its to change and
-- empty by default (0017 left that default alone), and the function only ever adds and reads.
revoke all on public.waitlist from public, anon, authenticated, service_role;
grant select, insert on public.waitlist to service_role;
-- <<< supabase/migrations/20261112120000_waitlist.sql

-- 2. After: no phone or browser touches the list, and the function's role adds to it.
do $$
begin
  if has_table_privilege('anon', 'public.waitlist', 'select, insert, update, delete')
     or has_table_privilege('authenticated', 'public.waitlist', 'select, insert, update, delete')
     or has_any_column_privilege('anon', 'public.waitlist', 'select, insert, update')
     or has_any_column_privilege('authenticated', 'public.waitlist', 'select, insert, update') then
    raise exception 'waitlist: anon or authenticated holds a privilege on the list. Nothing was changed.';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.waitlist'::regclass) then
    raise exception 'waitlist: row security is off. Nothing was changed.';
  end if;
  if not has_table_privilege('service_role', 'public.waitlist', 'insert')
     or not has_table_privilege('service_role', 'public.waitlist', 'select') then
    raise exception 'waitlist: service_role cannot add to the list. Nothing was changed.';
  end if;
end $$;

-- 3. The ledger row, once.
insert into supabase_migrations.schema_migrations (version, name, statements)
select greatest(to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
                (select (max(version)::bigint + 1)::text from supabase_migrations.schema_migrations
                 where version ~ '^[0-9]{14}$')),
       'waitlist', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'waitlist');

commit;
