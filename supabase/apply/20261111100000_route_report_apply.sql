-- ParaPo — apply 20261111100000_route_report.sql to the live project, in one run.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it once. One transaction: it
-- checks the project first, applies supabase/migrations/20261111100000_route_report.sql (copied
-- below unchanged), checks the result, and writes the ledger row. If any check fails it raises,
-- and nothing at all is changed, ledger included. A second run stops at step 1 and changes nothing.
-- Afterwards: 20261111100000_route_report_check.sql (it adds a test editor, a route and reports,
-- and rolls them back). Then give report_sender a password and login, by hand (README.md).
-- Undo: 20261111100000_route_report_revert.sql.
--
-- Safe to apply now: nothing calls it yet. The Worker that will is a later change.

begin;

-- 1. Before: lock_map_tables is in the ledger and this has not run.
do $$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'route_report') then
    raise exception 'route_report: already applied. Nothing was changed.';
  end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where name = 'lock_map_tables') then
    raise exception 'route_report: 20261105190000_lock_map_tables is not applied here. Nothing was changed.';
  end if;
end $$;

-- >>> supabase/migrations/20261111100000_route_report.sql, unchanged
-- ParaPo — a commuter can report a problem with a route: one table, one way in.
--
-- ADR 0010 (docs/adr/0010-commuters-can-report-a-route-problem.md), design B of Q158. The public
-- map posts a report to a Cloudflare Worker at its own origin, /api/report. The Worker checks
-- Turnstile and its own rate limit, then calls report.submit_route_report over a Postgres connection as
-- report_sender, a role that may run that one function and nothing else. The public page holds
-- no database address or key; the Worker holds the connection string as a secret.
--
-- What a report holds: the route, optionally the direction, its kind (wrong_line, wrong_fare,
-- wrong_stop, wrong_signboard, no_longer_runs or other: Q150), the commuter's words (optional, up
-- to 500 characters, required for other), when it came, and what an editor did with it. Never an IP address (not even
-- hashed), a location, a device id or an account: the owner's rule, and the table has no column
-- that could hold one.
--
--   public.route_report  RLS on. Editors read it and set its status (open, done, dismissed);
--                        nobody inserts or deletes through the API. resolved_by and resolved_at
--                        are set by a trigger when the status changes, never by the caller.
--   report.submit_route_report
--                        security definer, search_path ''. In the schema report, which the
--                        REST API does not expose; revoked from public, anon and authenticated,
--                        granted to report_sender only. Answers one word: sent, bad_kind,
--                        bad_note, unknown_route, busy, route_full or full. Caps, checked under one lock
--                        so two reports cannot both slip under one: 20 a route in a rolling day,
--                        30 in any minute, 2000 in any day, and 50,000 rows in all, so reports
--                        cannot fill the 500 MB database (a row is under 1 kB).
--   report_sender        nologin here, connection limit 5. The owner gives it a password and
--                        login on the live project, by hand, and keeps the password out of the
--                        repo (supabase/apply/README.md).
--
-- Order: after 20261105190000_lock_map_tables. Not applied by the session that wrote it: the
-- owner applies it, as postgres, from supabase/apply/20261111100000_route_report_apply.sql, then
-- records the ledger version. Safe to run twice. Undo:
-- supabase/apply/20261111100000_route_report_revert.sql.

create table if not exists public.route_report (
  id           uuid primary key default gen_random_uuid(),
  route_id     uuid not null references public.route (id) on delete cascade,
  direction_id uuid references public.route_variant (id) on delete set null,
  kind         text not null check (kind in ('wrong_line', 'wrong_fare', 'wrong_stop', 'wrong_signboard',
                                            'no_longer_runs', 'other')),
  note         text check (char_length(note) between 1 and 500),
  status       text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  created_at   timestamptz not null default now(),
  resolved_by  uuid references auth.users (id) on delete set null,
  resolved_at  timestamptz
);
comment on table public.route_report is
  'A problem a commuter reported with a route. Holds no IP, location, device id or account (ADR 0010).';
create index if not exists route_report_created_at on public.route_report (created_at);
create index if not exists route_report_route_created_at on public.route_report (route_id, created_at);

-- public's default privileges give every new table to anon and authenticated: take them back,
-- then give editors only what they use.
alter table public.route_report enable row level security;
revoke all on table public.route_report from public, anon, authenticated;
grant select on table public.route_report to authenticated;
grant update (status) on table public.route_report to authenticated;

drop policy if exists route_report_editors_read on public.route_report;
create policy route_report_editors_read on public.route_report
  for select to authenticated using ((select private.is_editor()));
drop policy if exists route_report_editors_handle on public.route_report;
create policy route_report_editors_handle on public.route_report
  for update to authenticated
  using ((select private.is_editor())) with check ((select private.is_editor()));

-- Who resolved it and when follow the status: an editor sets only the status.
create or replace function private.route_report_resolved()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'open' then
      new.resolved_by := null;
      new.resolved_at := null;
    else
      new.resolved_by := auth.uid();
      new.resolved_at := now();
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.route_report_resolved() from public, anon, authenticated;

create or replace trigger route_report_resolved
  before update of status on public.route_report
  for each row execute function private.route_report_resolved();

-- The one way in, in a schema the REST API does not expose.
create schema if not exists report;
revoke all on schema report from public;

create or replace function report.submit_route_report(
  p_route_id uuid, p_direction_id uuid, p_kind text, p_note text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if p_kind is null or p_kind not in ('wrong_line', 'wrong_fare', 'wrong_stop', 'wrong_signboard',
                                      'no_longer_runs', 'other') then
    return 'bad_kind';
  end if;
  -- Words are optional, at most 500 characters, and say what "other" is.
  if char_length(v_note) > 500 or (p_kind = 'other' and v_note is null) then
    return 'bad_note';
  end if;
  if not exists (select 1 from public.route r where r.id = p_route_id and r.status = 'approved') then
    return 'unknown_route';
  end if;
  if p_direction_id is not null and not exists (
    select 1 from public.route_variant v where v.id = p_direction_id and v.route_id = p_route_id
  ) then
    return 'unknown_route';
  end if;
  -- One report at a time, so the counts below cannot be raced past.
  perform pg_advisory_xact_lock(hashtext('public.route_report'));
  if (select count(*) from public.route_report) >= 50000
     or (select count(*) from public.route_report where created_at > now() - interval '1 day') >= 2000 then
    return 'full';
  end if;
  if (select count(*) from public.route_report where created_at > now() - interval '1 minute') >= 30 then
    return 'busy';
  end if;
  if (select count(*) from public.route_report
      where route_id = p_route_id and created_at > now() - interval '1 day') >= 20 then
    return 'route_full';
  end if;
  insert into public.route_report (route_id, direction_id, kind, note)
    values (p_route_id, p_direction_id, p_kind, v_note);
  return 'sent';
end;
$$;
revoke all on function report.submit_route_report(uuid, uuid, text, text) from public, anon, authenticated;

-- The Worker's role: it may reach the schema and run the function, nothing else.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'report_sender') then
    create role report_sender nologin connection limit 5;
  end if;
end $$;
alter role report_sender set statement_timeout = '5s';
grant usage on schema report to report_sender;
grant execute on function report.submit_route_report(uuid, uuid, text, text) to report_sender;
-- <<< supabase/migrations/20261111100000_route_report.sql

-- 2. After: the table is the editors' only, the function report_sender's only.
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'report_sender'] loop
    if has_table_privilege(r, 'public.route_report', 'insert')
       or has_table_privilege(r, 'public.route_report', 'delete')
       or has_any_column_privilege(r, 'public.route_report', 'insert') then
      raise exception 'route_report: % can insert into or delete from route_report. Nothing was changed.', r;
    end if;
  end loop;
  if has_table_privilege('anon', 'public.route_report', 'select')
     or has_table_privilege('report_sender', 'public.route_report', 'select') then
    raise exception 'route_report: anon or report_sender can read route_report. Nothing was changed.';
  end if;
  if has_column_privilege('authenticated', 'public.route_report', 'note', 'update')
     or has_column_privilege('authenticated', 'public.route_report', 'resolved_by', 'update')
     or not has_column_privilege('authenticated', 'public.route_report', 'status', 'update') then
    raise exception 'route_report: editors may update more than the status, or not the status. Nothing was changed.';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.route_report'::regclass) then
    raise exception 'route_report: row security is off. Nothing was changed.';
  end if;
  foreach r in array array['anon', 'authenticated'] loop
    if has_schema_privilege(r, 'report', 'usage')
       or has_function_privilege(r, 'report.submit_route_report(uuid, uuid, text, text)', 'execute') then
      raise exception 'route_report: % can reach report.submit_route_report. Nothing was changed.', r;
    end if;
  end loop;
  if not has_function_privilege('report_sender', 'report.submit_route_report(uuid, uuid, text, text)', 'execute') then
    raise exception 'route_report: report_sender cannot run report.submit_route_report. Nothing was changed.';
  end if;
end $$;

-- 3. The ledger row, once.
insert into supabase_migrations.schema_migrations (version, name, statements)
select greatest(to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
                (select (max(version)::bigint + 1)::text from supabase_migrations.schema_migrations
                 where version ~ '^[0-9]{14}$')),
       'route_report', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'route_report');

commit;
