-- ParaPo — undo 0018_review.sql on the live project, in one run.
--
-- Paste the whole file into the SQL editor (role: postgres). One transaction:
-- it refuses, changing nothing, once a row is taken down or a draft is kept
-- (undoing then would publish what was taken down and lose the drafts).
-- Otherwise it puts the schema back as 0021 left it (run.sh compares a dump)
-- and removes the ledger row. Then regenerate the types.

begin;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'route' and column_name = 'status')
     and (exists (select 1 from public.route where status <> 'approved')
          or exists (select 1 from public.stop where status <> 'approved')
          or exists (select 1 from public.draft)) then
    raise exception 'A row is taken down or a draft is kept: 0018 is not undone. Nothing was changed.';
  end if;
end $$;

drop table if exists public.draft, public.takedown, public.editor_name;

drop trigger if exists route_variant_bumps_route on public.route_variant;
drop trigger if exists route_revision on public.route;
drop trigger if exists stop_revision on public.stop;
drop trigger if exists stop_touch on public.stop;
drop trigger if exists route_approved_ends on public.route;
drop trigger if exists stop_takedown_guard on public.stop;
drop trigger if exists route_takedown_log on public.route;
drop trigger if exists stop_takedown_log on public.stop;
drop function if exists private.bump_revision();
drop function if exists private.direction_bumps_route();
drop function if exists private.route_ends_approved();
drop function if exists private.stop_takedown_guard();
drop function if exists private.log_takedown();
drop function if exists private.draft_revision();

-- Reads: everyone sees every row again (0001).
drop policy if exists route_read_approved on public.route;
drop policy if exists route_read_editor on public.route;
drop policy if exists route_variant_read_approved on public.route_variant;
drop policy if exists route_variant_read_editor on public.route_variant;
drop policy if exists stop_read_approved on public.stop;
drop policy if exists stop_read_editor on public.stop;
drop policy if exists route_stop_read_approved on public.route_stop;
drop policy if exists route_stop_read_editor on public.route_stop;
drop policy if exists route_read on public.route;
drop policy if exists route_variant_read on public.route_variant;
drop policy if exists stop_read on public.stop;
drop policy if exists route_stop_read on public.route_stop;
create policy route_read         on public.route         for select using (true);
create policy route_variant_read on public.route_variant for select using (true);
create policy stop_read          on public.stop          for select using (true);
create policy route_stop_read    on public.route_stop    for select using (true);

-- Uniqueness over every row again (0006, 0021, 0014), built before the
-- partial ones go with the status column.
drop index if exists public.route_ends_unique_pre0018;
create unique index route_ends_unique_pre0018
  on public.route (head_stop_id, tail_stop_id, coalesce(via, ''));
drop index if exists public.route_ends_unique;
alter index public.route_ends_unique_pre0018 rename to route_ends_unique;

drop index if exists public.route_loop_unique_pre0018;
create unique index route_loop_unique_pre0018
  on public.route (lower(btrim(signboard)), coalesce(via, ''))
  where is_loop;
drop index if exists public.route_loop_unique;
alter index public.route_loop_unique_pre0018 rename to route_loop_unique;

drop index if exists public.stop_terminal_place_unique_pre0018;
create unique index stop_terminal_place_unique_pre0018
  on public.stop (lower(coalesce(nullif(btrim(informal), ''), name)))
  where kind = 'terminal';
drop index if exists public.stop_terminal_place_unique;
alter index public.stop_terminal_place_unique_pre0018 rename to stop_terminal_place_unique;

alter table public.route
  drop constraint if exists route_status_check,
  drop column if exists status,
  drop column if exists status_at,
  drop column if exists revision;
alter table public.stop
  drop constraint if exists stop_status_check,
  drop column if exists status,
  drop column if exists status_at,
  drop column if exists revision,
  drop column if exists updated_at;

delete from supabase_migrations.schema_migrations where name = '0018_review';

commit;
