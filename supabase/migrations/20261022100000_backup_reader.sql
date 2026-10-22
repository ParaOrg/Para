-- ParaPo — backup_reader, the weekly backup's read-only login
--
-- Ticket contribute/15, .scratch/contribute/database.md section 7. The
-- backup workflow (.github/workflows/backup.yml) runs pg_dump as this role,
-- so the first database secret in GitHub holds as little as possible: SELECT
-- on the contributor tables and the route tables, and a read policy on each
-- (row security is on, and pg_dump runs with it on, so a table without a
-- policy for the role makes the dump fail instead of leaving rows out).
--
-- Never private.editor: who the editors are is not part of the backup, and
-- the role has no grant on schema private at all. editor_name is left out for
-- the same reason (it points at private.editor); the editors write it again.
--
-- Covered:
--   contributor, contribution, point_batch and every monthly piece and the
--   default, hinto, contribution_use
--   route, route_variant, stop, route_stop, draft, takedown, gps_session
--
-- A new monthly piece of point_batch (private.add_months) has no grant or
-- policy for the role yet. After each `select private.add_months(12);` run
--   select private.grant_backup_reader();
-- or the next backup fails on that piece, loudly. The function is idempotent
-- and only the owner (postgres) can run it.
--
-- No password in this file. The owner sets it once, in the SQL editor, from
-- the setup checklist in .github/workflows/backup.yml:
--   alter role backup_reader with password '<long random password>';
-- Until then the role cannot log in.
--
-- Written, not applied: the owner applies it.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'backup_reader') then
    create role backup_reader with login nosuperuser nocreatedb nocreaterole noinherit;
  end if;
end $$;

-- Reads only, and not for ever: a hung dump gives up its connection.
alter role backup_reader set default_transaction_read_only = on;
alter role backup_reader set statement_timeout = '10min';

grant usage on schema public to backup_reader;

-- Grants and a read policy for every table the backup covers, the pieces of
-- point_batch included. Safe to run again.
create or replace function private.grant_backup_reader() returns void
language plpgsql
set search_path = ''
as $$
declare
  t record;
begin
  for t in
    select c.oid::regclass as tbl, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and (
        c.relname in (
          'contributor', 'contribution', 'hinto', 'contribution_use',
          'route', 'route_variant', 'stop', 'route_stop', 'draft', 'takedown', 'gps_session'
        )
        or c.relname = 'point_batch'
        or c.relname like 'point\_batch\_%'
      )
  loop
    execute format('grant select on %s to backup_reader', t.tbl);
    execute format('drop policy if exists backup_reader_read on %s', t.tbl);
    execute format(
      'create policy backup_reader_read on %s for select to backup_reader using (true)', t.tbl
    );
  end loop;
end $$;

revoke all on function private.grant_backup_reader() from public, anon, authenticated;

select private.grant_backup_reader();
