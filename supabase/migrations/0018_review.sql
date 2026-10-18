-- ParaPo — the review step: approved and taken-down rows, drafts, takedowns
--
-- Why: since 0015 three editors change every route and hotspot, and every
-- save reaches commuters at that night's publish. This adds the database half
-- of Draft → Pending → Approved (.scratch/contribute/database.md §8,
-- .scratch/studio-maps/issues/01). The studio keeps saving live rows until it
-- learns about drafts (studio-maps/05); nothing it does today changes here.
--
-- What it adds:
--   1. route and stop: status ('approved' or 'taken_down', default
--      'approved'), status_at (when the status last changed), revision (an
--      aggregate content version), and stop.updated_at with the touch trigger.
--      Every existing row becomes approved, so commuters see no change.
--   2. route.revision counts every change to a route's authored content: its
--      own columns and any insert, update or delete of one of its directions
--      (geometry, signboards). route.updated_at alone misses a direction's
--      change (each table has its own touch trigger, 0001), so a draft's base
--      check against it would let a concurrent direction edit be lost. A
--      direction's write bumps its route under the route's row lock, which
--      also serialises concurrent direction writes against the route's
--      approval. Links (route_stop) are derived from geometry and are not
--      counted. stop.revision does the same for a hotspot.
--      Because a direction's write now touches route.updated_at too, "changed
--      since the last publish" is route.updated_at / stop.updated_at or
--      status_at newer than the file's published_at.
--   3. The uniqueness rules read approved rows only: route_ends_unique,
--      route_loop_unique (0021) and stop_terminal_place_unique become partial
--      on status = 'approved', under their own names (the studio matches
--      them). A taken-down route never blocks a new one with its ends; putting
--      it back over a new one is refused by the same index.
--   4. Two guards, as triggers, safe under concurrency:
--      - a route is approved only with both ends approved; a loop (null ends,
--        0021) passes. The ends are read FOR SHARE, so a concurrent take-down
--        of one waits for this transaction, or this waits for it and sees it.
--      - a hotspot that ends an approved route can't be taken down. Its own
--        row is locked by the update before the check, so it meets the
--        approval above in one order or the other, never both unseen.
--   5. Reads: anon and authenticated see approved rows only (a direction by
--      its route, a link by both ends); editors see everything. The publish
--      reads as anon, so it reads approved work with no change to its queries.
--      private.loop_one_way (0021, security invoker) still sees every loop
--      for an editor, the only role that writes a direction.
--   6. New tables, each with its own grants (0017: none by default):
--      - draft: one per route or hotspot being changed (unique kind,
--        subject_id), a versioned JSON payload, base_revision, its own
--        revision for conditional saves, editor-only.
--      - takedown: every take-down and its put-back, written by a trigger on
--        the status change, never by hand. anon reads kind, subject_id,
--        taken_down_at and put_back_at (column grants): they name things that
--        were public, for the publish's shrink guard. Who did it stays private.
--      - editor_name: "being changed by X", readable by editors, filled by the
--        owner by hand as private.editor is.
--
-- Not here: the approval transaction (a later migration with the studio's
-- draft work), contributor tables (0019), backups (0020), any auth setting.
--
-- Not applied by the session that wrote it: the owner applies it, as postgres,
-- from the SQL editor with the ledger row (README, "Applying a file"), then
-- regenerates the types. Safe to run twice. Verified on a throwaway Postgres
-- (supabase/verify/).
--
-- Reversible while no row is taken down and no draft is kept:
--   drop table if exists public.draft, public.takedown, public.editor_name;
--   drop trigger if exists route_variant_bumps_route on public.route_variant;
--   drop trigger if exists route_revision on public.route;
--   drop trigger if exists stop_revision on public.stop;
--   drop trigger if exists stop_touch on public.stop;
--   drop trigger if exists route_approved_ends on public.route;
--   drop trigger if exists stop_takedown_guard on public.stop;
--   drop trigger if exists route_takedown_log on public.route;
--   drop trigger if exists stop_takedown_log on public.stop;
--   then re-create the three indexes without "and status = 'approved'",
--   restore the four "using (true)" read rules of 0001, and drop the columns
--   status, status_at, revision (route, stop) and updated_at (stop).

-- 1. Status, revision, stop.updated_at.
alter table public.route
  add column if not exists status text not null default 'approved',
  add column if not exists status_at timestamptz not null default now(),
  add column if not exists revision bigint not null default 1;
alter table public.stop
  add column if not exists status text not null default 'approved',
  add column if not exists status_at timestamptz not null default now(),
  add column if not exists revision bigint not null default 1,
  add column if not exists updated_at timestamptz not null default now();

alter table public.route drop constraint if exists route_status_check;
alter table public.route
  add constraint route_status_check check (status in ('approved', 'taken_down'));
alter table public.stop drop constraint if exists stop_status_check;
alter table public.stop
  add constraint stop_status_check check (status in ('approved', 'taken_down'));

comment on column public.route.status is 'approved: published at the next publish. taken_down: left out of it.';
comment on column public.route.revision is 'Bumped by every change to the route or one of its directions. A draft records it as base_revision.';
comment on column public.stop.revision is 'Bumped by every change to the hotspot. A draft records it as base_revision.';

create or replace trigger stop_touch before update on public.stop
  for each row execute function public.touch_updated_at();

-- 2. The aggregate revision. status_at moves only when status does.
create or replace function private.bump_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- A direction's write sets the route's revision itself; leave it.
  if new.revision = old.revision then
    new.revision := old.revision + 1;
  end if;
  if new.status is distinct from old.status then
    new.status_at := now();
  end if;
  return new;
end;
$$;

create or replace trigger route_revision before update on public.route
  for each row execute function private.bump_revision();
create or replace trigger stop_revision before update on public.stop
  for each row execute function private.bump_revision();

create or replace function private.direction_bumps_route()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.route set revision = revision + 1 where id = old.route_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE')
     and (tg_op = 'INSERT' or new.route_id is distinct from old.route_id) then
    update public.route set revision = revision + 1 where id = new.route_id;
  end if;
  return null;
end;
$$;

create or replace trigger route_variant_bumps_route
  after insert or update or delete on public.route_variant
  for each row execute function private.direction_bumps_route();

-- 3. Uniqueness on approved rows, built before the old index goes.
drop index if exists public.route_ends_unique_0018;
create unique index route_ends_unique_0018
  on public.route (head_stop_id, tail_stop_id, coalesce(via, ''))
  where status = 'approved';
drop index if exists public.route_ends_unique;
alter index public.route_ends_unique_0018 rename to route_ends_unique;

drop index if exists public.route_loop_unique_0018;
create unique index route_loop_unique_0018
  on public.route (lower(btrim(signboard)), coalesce(via, ''))
  where is_loop and status = 'approved';
drop index if exists public.route_loop_unique;
alter index public.route_loop_unique_0018 rename to route_loop_unique;

drop index if exists public.stop_terminal_place_unique_0018;
create unique index stop_terminal_place_unique_0018
  on public.stop (lower(coalesce(nullif(btrim(informal), ''), name)))
  where kind = 'terminal' and status = 'approved';
drop index if exists public.stop_terminal_place_unique;
alter index public.stop_terminal_place_unique_0018 rename to stop_terminal_place_unique;

-- 4. The guards. Security definer: they must see and lock every row whatever
--    the caller's read rules show.
create or replace function private.route_ends_approved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  approved_ends integer;
begin
  if new.status <> 'approved' or new.is_loop then
    return new;
  end if;
  select count(*) into approved_ends
  from (
    select s.status from public.stop s
    where s.id in (new.head_stop_id, new.tail_stop_id)
    for share
  ) ends
  where ends.status = 'approved';
  if approved_ends < (case when new.head_stop_id = new.tail_stop_id then 1 else 2 end) then
    raise exception 'A route is approved only with both its ends approved.'
      using errcode = '23514', constraint = 'route_approved_ends';
  end if;
  return new;
end;
$$;

create or replace trigger route_approved_ends
  before insert or update of status, head_stop_id, tail_stop_id on public.route
  for each row execute function private.route_ends_approved();

create or replace function private.stop_takedown_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'taken_down' and old.status = 'approved' and exists (
    select 1 from public.route r
    where r.status = 'approved'
      and (r.head_stop_id = new.id or r.tail_stop_id = new.id)
  ) then
    raise exception 'A hotspot that ends an approved route can''t be taken down.'
      using errcode = '23514', constraint = 'stop_takedown_guard';
  end if;
  return new;
end;
$$;

create or replace trigger stop_takedown_guard
  before update of status on public.stop
  for each row execute function private.stop_takedown_guard();

-- 5. The takedown history.
create table if not exists public.takedown (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('route', 'hotspot')),
  subject_id uuid not null,
  taken_down_at timestamptz not null default now(),
  put_back_at timestamptz,
  editor_id uuid default auth.uid() references auth.users (id) on delete set null,
  put_back_by uuid references auth.users (id) on delete set null
);
create index if not exists takedown_subject_idx on public.takedown (subject_id);
create index if not exists takedown_taken_down_at_idx on public.takedown (taken_down_at);
create index if not exists takedown_editor_id_idx on public.takedown (editor_id) where editor_id is not null;
create index if not exists takedown_put_back_by_idx on public.takedown (put_back_by) where put_back_by is not null;

create or replace function private.log_takedown()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  subject_kind text := case tg_table_name when 'route' then 'route' else 'hotspot' end;
begin
  if new.status is not distinct from old.status then
    return null;
  end if;
  if new.status = 'taken_down' then
    insert into public.takedown (kind, subject_id, editor_id)
    values (subject_kind, new.id, (select auth.uid()));
  else
    update public.takedown
    set put_back_at = now(), put_back_by = (select auth.uid())
    where kind = subject_kind and subject_id = new.id and put_back_at is null;
  end if;
  return null;
end;
$$;

create or replace trigger route_takedown_log after update of status on public.route
  for each row execute function private.log_takedown();
create or replace trigger stop_takedown_log after update of status on public.stop
  for each row execute function private.log_takedown();

alter table public.takedown enable row level security;
drop policy if exists takedown_read_public on public.takedown;
create policy takedown_read_public on public.takedown
  for select to anon using (true);
drop policy if exists takedown_read_editor on public.takedown;
create policy takedown_read_editor on public.takedown
  for select to authenticated using ((select private.is_editor()));
revoke all on public.takedown from anon, authenticated;
grant select (kind, subject_id, taken_down_at, put_back_at) on public.takedown to anon;
grant select on public.takedown to authenticated;

-- 6. Drafts. Whose draft may be changed is the studio's rule; in the database
--    any editor may update or delete any draft (Send back, Approve).
create table if not exists public.draft (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('route', 'hotspot')),
  subject_id uuid not null,
  is_new boolean not null,
  status text not null default 'draft' check (status in ('draft', 'pending')),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and coalesce(jsonb_typeof(payload -> 'version') = 'number', false)
    and pg_column_size(payload) <= 2000000
  ),
  base_revision bigint check (is_new or base_revision is not null),
  revision integer not null default 1,
  editor_id uuid default auth.uid() references auth.users (id) on delete set null,
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  constraint draft_one_per_subject unique (kind, subject_id)
);
create index if not exists draft_editor_id_idx on public.draft (editor_id);

create or replace function private.draft_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;

create or replace trigger draft_revision before update on public.draft
  for each row execute function private.draft_revision();

alter table public.draft enable row level security;
drop policy if exists draft_select on public.draft;
create policy draft_select on public.draft for select to authenticated
  using ((select private.is_editor()));
drop policy if exists draft_insert on public.draft;
create policy draft_insert on public.draft for insert to authenticated
  with check ((select private.is_editor()) and editor_id = (select auth.uid()));
drop policy if exists draft_update on public.draft;
create policy draft_update on public.draft for update to authenticated
  using ((select private.is_editor())) with check ((select private.is_editor()));
drop policy if exists draft_delete on public.draft;
create policy draft_delete on public.draft for delete to authenticated
  using ((select private.is_editor()));
revoke all on public.draft from anon, authenticated;
grant select, insert, update, delete on public.draft to authenticated;

-- 7. Editor names.
create table if not exists public.editor_name (
  user_id uuid primary key references private.editor (user_id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60)
);
alter table public.editor_name enable row level security;
drop policy if exists editor_name_select on public.editor_name;
create policy editor_name_select on public.editor_name for select to authenticated
  using ((select private.is_editor()));
revoke all on public.editor_name from anon, authenticated;
grant select on public.editor_name to authenticated;

-- 8. Reads: approved for everyone, everything for editors.
drop policy if exists route_read on public.route;
drop policy if exists route_read_approved on public.route;
create policy route_read_approved on public.route for select to anon, authenticated
  using (status = 'approved');
drop policy if exists route_read_editor on public.route;
create policy route_read_editor on public.route for select to authenticated
  using ((select private.is_editor()));

drop policy if exists route_variant_read on public.route_variant;
drop policy if exists route_variant_read_approved on public.route_variant;
create policy route_variant_read_approved on public.route_variant for select to anon, authenticated
  using (exists (
    select 1 from public.route r where r.id = route_variant.route_id and r.status = 'approved'
  ));
drop policy if exists route_variant_read_editor on public.route_variant;
create policy route_variant_read_editor on public.route_variant for select to authenticated
  using ((select private.is_editor()));

drop policy if exists stop_read on public.stop;
drop policy if exists stop_read_approved on public.stop;
create policy stop_read_approved on public.stop for select to anon, authenticated
  using (status = 'approved');
drop policy if exists stop_read_editor on public.stop;
create policy stop_read_editor on public.stop for select to authenticated
  using ((select private.is_editor()));

drop policy if exists route_stop_read on public.route_stop;
drop policy if exists route_stop_read_approved on public.route_stop;
create policy route_stop_read_approved on public.route_stop for select to anon, authenticated
  using (
    exists (
      select 1 from public.route_variant v join public.route r on r.id = v.route_id
      where v.id = route_stop.route_variant_id and r.status = 'approved'
    )
    and exists (
      select 1 from public.stop s where s.id = route_stop.stop_id and s.status = 'approved'
    )
  );
drop policy if exists route_stop_read_editor on public.route_stop;
create policy route_stop_read_editor on public.route_stop for select to authenticated
  using ((select private.is_editor()));

-- As 0005: a new function is executable by PUBLIC until revoked. Trigger
-- functions are never called directly; authenticated keeps EXECUTE as 0021's.
revoke all on function private.bump_revision() from public, anon;
revoke all on function private.direction_bumps_route() from public, anon;
revoke all on function private.route_ends_approved() from public, anon;
revoke all on function private.stop_takedown_guard() from public, anon;
revoke all on function private.log_takedown() from public, anon;
revoke all on function private.draft_revision() from public, anon;
grant execute on function private.bump_revision() to authenticated;
grant execute on function private.direction_bumps_route() to authenticated;
grant execute on function private.route_ends_approved() to authenticated;
grant execute on function private.stop_takedown_guard() to authenticated;
grant execute on function private.log_takedown() to authenticated;
grant execute on function private.draft_revision() to authenticated;
