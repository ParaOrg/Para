-- ParaPo — a loop: a route that goes round, with no ends
--
-- The owner's ask, 2026-10-17, after an editor met it: "UP Ikot" goes round
-- the UP campus one way with no start ("walang specific start… deredeterso
-- lang"), and "UP Toki" is the same streets the other way round, with its
-- own signboard. A route is two ends and two directions (0006), so neither
-- could be saved: the save panel refuses a route whose two ends are one
-- place. A loop is a route with neither:
--
--   * route.is_loop, on the route because the ends are the route's. A loop
--     has no head and no tail; every other route keeps both, as before.
--   * A loop is called by its signboard (the generated name has no ends to
--     read), so a loop must have one, and two loops may share one only when
--     via tells them apart, as two routes may share both ends
--     (route_ends_unique, which a loop's null ends never meet).
--   * A loop is one direction, the way it was drawn: its way back is refused
--     here, and route_variant_one_per_direction (0006) leaves room for one.
--     The other way round is another loop, with its own signboard.
--   * A route is made a loop or not and stays so, so a two-ended route can
--     never become a loop with a way back still under it.
--
-- Not enforced: that a loop has its one direction. A save is two requests;
-- the studio claims a route left without one (routes-write.ts).
--
-- Every existing row is_loop false and keeps both ends, so the checks hold
-- as they are and nothing is rewritten. No new table, so no grants (README,
-- "Grants for new tables"); the column is read and written under route's
-- own grants and policies (0005, 0015, 0017).
--
-- For 0018 (the review step, not yet written): make route_loop_unique
-- partial on status as well, and let its "both ends approved" guard pass a
-- loop, whose ends are null.
--
-- Not applied by the session that wrote it: the owner applies it, as
-- postgres, from the SQL editor with the ledger row (README, "Applying a
-- file"). Safe to run twice.
--
-- Reversible, once no loop is left:
--   drop trigger if exists route_variant_loop_one_way on public.route_variant;
--   drop trigger if exists route_loop_fixed on public.route;
--   drop function if exists private.loop_one_way();
--   drop function if exists private.loop_fixed();
--   drop index if exists public.route_loop_unique;
--   alter table public.route
--     drop constraint if exists route_loop_signboard,
--     drop constraint if exists route_loop_ends,
--     alter column head_stop_id set not null,
--     alter column tail_stop_id set not null,
--     drop column if exists is_loop;

-- 1. The flag.
alter table public.route
  add column if not exists is_loop boolean not null default false;

comment on column public.route.is_loop is
  'A loop: goes round one way with no head or tail, one direction, called by its signboard. Set when the route is made; never changes.';

-- 2. A loop has no ends; every other route has both.
alter table public.route
  alter column head_stop_id drop not null,
  alter column tail_stop_id drop not null;

alter table public.route drop constraint if exists route_loop_ends;
alter table public.route
  add constraint route_loop_ends check (
    (is_loop and head_stop_id is null and tail_stop_id is null)
    or (not is_loop and head_stop_id is not null and tail_stop_id is not null)
  );

-- 3. A loop is called by its signboard.
alter table public.route drop constraint if exists route_loop_signboard;
alter table public.route
  add constraint route_loop_signboard check (
    not is_loop or coalesce(btrim(signboard), '') <> ''
  );

-- 4. One loop per signboard, unless via tells two apart. Case and the
--    spaces at either end fold, as the terminal index folds a place (0014).
create unique index if not exists route_loop_unique
  on public.route (lower(btrim(signboard)), coalesce(via, ''))
  where is_loop;

-- 5. A loop is one direction: the way it was drawn, never a way back.
create or replace function private.loop_one_way()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reversed and exists (
    select 1 from public.route r where r.id = new.route_id and r.is_loop
  ) then
    raise exception 'A loop has one direction: it has no way back.'
      using errcode = '23514', constraint = 'route_variant_loop_one_way';
  end if;
  return new;
end;
$$;

create or replace trigger route_variant_loop_one_way
  before insert or update of route_id, reversed on public.route_variant
  for each row execute function private.loop_one_way();

-- 6. Made a loop or not, and stays so.
create or replace function private.loop_fixed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_loop is distinct from old.is_loop then
    raise exception 'A route is made a loop or not, and stays so.'
      using errcode = '23514', constraint = 'route_loop_fixed';
  end if;
  return new;
end;
$$;

create or replace trigger route_loop_fixed
  before update of is_loop on public.route
  for each row execute function private.loop_fixed();

-- As 0005: a new function is executable by PUBLIC until revoked.
revoke all on function private.loop_one_way() from public, anon;
revoke all on function private.loop_fixed() from public, anon;
grant execute on function private.loop_one_way() to authenticated;
grant execute on function private.loop_fixed() to authenticated;
