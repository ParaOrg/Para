-- ParaPo — apply 20261031090000_account_stats.sql to the live project, in one run.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it once.
-- It is one transaction: it checks the project first, applies
-- supabase/migrations/20261031090000_account_stats.sql (copied below unchanged), checks the
-- result, and writes the ledger row. If any check fails it raises, and nothing
-- at all is changed, ledger included. A second run stops at step 1 and changes
-- nothing.
-- Afterwards: supabase/apply/20261031090000_account_stats_check.sql (it adds test rows and
-- rolls them back), then regenerate the types. Undo: 20261031090000_account_stats_revert.sql.
--
-- Order: after 20261024090000_contributor_accounts (step 1 refuses without it),
-- and before the app that sends walk_m, ride_m, walk_s and ride_s ships, so
-- none of its rides is saved without them. Apps already in the field keep
-- saving: the four keys are optional.
--
-- Adds four nullable columns to contribution (every existing row stays as it
-- is, with null), one private table, four functions, and replaces
-- save_contribution, private.retire_month and finish_claim with versions that
-- differ only by the steps the migration's header names.

begin;

-- 1. Before: the contributor accounts migration is in the ledger, and this has not run.
do $$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'account_stats') then
    raise exception 'account_stats: already applied. Nothing was changed.';
  end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where name = 'contributor_accounts')
     or to_regprocedure('public.finish_claim(uuid)') is null
     or to_regprocedure('private.retire_month(date, integer)') is null then
    raise exception 'account_stats: 20261024090000_contributor_accounts is not applied here. Nothing was changed.';
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'contribution'
               and column_name in ('walk_m', 'ride_m', 'walk_s', 'ride_s'))
     or to_regclass('private.contributor_retired_totals') is not null then
    raise exception 'account_stats: the columns or the table already exist. Nothing was changed.';
  end if;
end $$;

-- >>> supabase/migrations/20261031090000_account_stats.sql, unchanged
-- ParaPo — account stats: walked and ridden per contribution, lifetime totals that outlive retirement
--
-- The numbers for the contributor's Account page, ready before the page is
-- designed. Nothing shows them yet.
--
--   contribution.walk_m, ride_m, walk_s, ride_s
--                  each saved recording, split into walked (Lakad) and ridden
--                  (Sakay) metres and seconds. The phone works them out
--                  (features/contribute/api/walk-ride-split.ts): walk_m + ride_m
--                  is distance_m and walk_s + ride_s is moving_s + standing_s.
--                  Null on every row from before and on any save from an app
--                  that does not send them; all four or none. The table's own
--                  checks hold them (>= 0, and each sum within 2 of its total, either way),
--                  so a direct insert is held to them too.
--   save_contribution(jsonb)
--                  reads them as four optional keys; a missing key stores null.
--                  Otherwise unchanged. It already ignored keys it does not
--                  read, so an app that sends them saves before and after this.
--   private.contributor_retired_totals
--                  one row per contributor: what retire_month took away from
--                  their live rows, added up. Goes with the contributor (on
--                  delete cascade). Counts only, never which routes or where.
--   private.retire_month
--                  unchanged but for one first step: each contributor's numbers
--                  for the month go into contributor_retired_totals before the
--                  month's hintos near the ends are deleted and the rides are
--                  unlinked. Rides an editor hid are left out, as they are live.
--   public.finish_claim(token)
--                  unchanged but for one step: the anonymous contributor's
--                  retired totals move to the account with its contributions,
--                  before its row (and so its totals) is deleted.
--   public.get_my_stats()
--                  the signed-in contributor's lifetime numbers in one row:
--                  their live, linked, not hidden contributions plus their
--                  retired totals. Deleting a ride lowers them, because it is no
--                  longer a live row.
--
-- What get_my_stats returns: rides; distance_m, moving_s, standing_s; walk_m,
-- ride_m, walk_s, ride_s (rides saved without the split count in neither, so
-- distance_m - walk_m - ride_m is the part not split); hinto_s (the seconds the
-- ride stood, its hintos'); marks (Mark presses); a ride count per vehicle;
-- active_days (distinct Asia/Manila dates a ride started on); first_ride_at;
-- the longest ride by distance (longest_ride_m and its moving seconds);
-- routes_helped and hintuans_helped (distinct contribution_use subjects of
-- each kind on their rides). Every count is a number: never an id.
--
-- Two numbers are close, not exact, across the 24-month line, because the
-- retired totals keep counts and not the days or routes behind them (keeping
-- which routes a person helped would undo what retirement unlinks):
--   active_days    a day counts once if a live ride and a retired one share it
--                  only when it is the last retired day; a ride received weeks
--                  after it started can count its day twice.
--   routes_helped  a route helped in two retired months, or in a retired month
--                  and a live one, counts once for each.
-- A claim adds the anonymous contributor's retired counts to the account's.
--
-- Who may do what:
--   a phone     calls get_my_stats() and reads only its own numbers; it has no
--               grant on contributor_retired_totals or contribution_use, so the
--               definer reads them for it.
--   editors     as a phone: their own numbers only.
--   anon        nothing.
--   the owner   runs retire_month as before (SQL editor, as postgres).
--
-- Order: needs 20261024090000_contributor_accounts (finish_claim). Apply this
-- before shipping an app that sends the four keys, so no ride from that app is
-- saved without them; an app that sends them earlier still saves (the keys are
-- ignored), and an older app keeps saving after (they are null).
--
-- Written, not applied: the owner applies it from
-- supabase/apply/20261031090000_account_stats_apply.sql.

-- -------------------------------------------------------- the split columns

alter table public.contribution
  add column walk_m integer check (walk_m >= 0),
  add column ride_m integer check (ride_m >= 0),
  add column walk_s integer check (walk_s >= 0),
  add column ride_s integer check (ride_s >= 0),
  add constraint contribution_split_whole check (
    (walk_m is null) = (ride_m is null)
    and (walk_m is null) = (walk_s is null)
    and (walk_m is null) = (ride_s is null)
  ),
  -- The phone makes the sums equal; 2 either way leaves room for its rounding.
  add constraint contribution_split_distance check (abs(walk_m + ride_m - distance_m) <= 2),
  add constraint contribution_split_time check (abs(walk_s + ride_s - moving_s - standing_s) <= 2);

-- ------------------------------------------------------------------- save

-- As 20261019125900_contributions.sql's, with the four split keys.
create or replace function public.save_contribution(recording jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare
  rid uuid := (recording ->> 'id')::uuid;
  stored uuid;
  arrived date;
  points integer;
begin
  if (select auth.uid()) is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  -- Before the insert: its trigger would count a resend against the day cap.
  if exists (select 1 from public.contribution where id = rid) then
    return 'already saved';
  end if;
  insert into public.contributor (id) values ((select auth.uid())) on conflict (id) do nothing;

  insert into public.contribution (
    id, format_version, rules_version, consent_version, started_at, ended_at, sent_at,
    vehicle, start_name, end_name, description,
    distance_m, moving_s, standing_s, lost_s, point_count,
    walk_m, ride_m, walk_s, ride_s,
    events, gaps, line, west, south, east, north
  ) values (
    rid,
    (recording ->> 'format_version')::smallint,
    (recording ->> 'rules_version')::smallint,
    (recording ->> 'consent_version')::smallint,
    (recording ->> 'started_at')::timestamptz,
    (recording ->> 'ended_at')::timestamptz,
    (recording ->> 'sent_at')::timestamptz,
    recording ->> 'vehicle',
    nullif(recording ->> 'start_name', ''),
    nullif(recording ->> 'end_name', ''),
    nullif(recording ->> 'description', ''),
    (recording ->> 'distance_m')::integer,
    (recording ->> 'moving_s')::integer,
    (recording ->> 'standing_s')::integer,
    (recording ->> 'lost_s')::integer,
    (recording ->> 'point_count')::integer,
    (recording ->> 'walk_m')::integer,
    (recording ->> 'ride_m')::integer,
    (recording ->> 'walk_s')::integer,
    (recording ->> 'ride_s')::integer,
    coalesce(recording -> 'events', '[]'::jsonb),
    coalesce(recording -> 'gaps', '[]'::jsonb),
    nullif(recording -> 'line', 'null'::jsonb),
    (recording ->> 'west')::double precision,
    (recording ->> 'south')::double precision,
    (recording ->> 'east')::double precision,
    (recording ->> 'north')::double precision
  ) on conflict (id) do nothing returning id, date_trunc('month', received_at)::date
    into stored, arrived;

  if stored is null then
    -- A second send racing the first waited for it here. Anyone else's id is
    -- refused, and row security hides whether it exists.
    if exists (select 1 from public.contribution where id = rid) then
      return 'already saved';
    end if;
    raise exception 'id_taken' using errcode = 'P0001';
  end if;

  insert into public.point_batch (
    contribution_id, seq, month, first_at, first_lat, first_lng, point_count,
    dt_ms, dlat, dlng, accuracy_m, speed_cms
  )
  select rid, (b ->> 'seq')::smallint, arrived, (b ->> 'first_at')::timestamptz,
    (b ->> 'first_lat')::integer, (b ->> 'first_lng')::integer, (b ->> 'point_count')::smallint,
    array(select jsonb_array_elements_text(b -> 'dt_ms')::integer),
    array(select jsonb_array_elements_text(b -> 'dlat')::integer),
    array(select jsonb_array_elements_text(b -> 'dlng')::integer),
    array(select jsonb_array_elements_text(b -> 'accuracy_m')::smallint),
    case when jsonb_typeof(b -> 'speed_cms') = 'array'
      then array(select nullif(x, 'null')::smallint from jsonb_array_elements_text(b -> 'speed_cms') x)
    end
  from jsonb_array_elements(coalesce(recording -> 'batches', '[]'::jsonb)) b;

  select coalesce(sum((b ->> 'point_count')::integer), 0) into points
    from jsonb_array_elements(coalesce(recording -> 'batches', '[]'::jsonb)) b;
  if points <> (recording ->> 'point_count')::integer then
    raise exception 'bad_points: point_count is not the batches'' total' using errcode = 'P0001';
  end if;

  insert into public.hinto (contribution_id, seq, started_at, seconds, lat, lng, rules_version)
  select rid, (h ->> 'seq')::smallint, (h ->> 'started_at')::timestamptz,
    (h ->> 'seconds')::integer, (h ->> 'lat')::double precision, (h ->> 'lng')::double precision,
    (recording ->> 'rules_version')::smallint
  from jsonb_array_elements(coalesce(recording -> 'hintos', '[]'::jsonb)) h;

  return 'saved';
end $$;

-- ---------------------------------------------------------- retired totals

create table private.contributor_retired_totals (
  contributor_id uuid primary key references public.contributor (id) on delete cascade,
  rides integer not null default 0,
  distance_m bigint not null default 0,
  moving_s bigint not null default 0,
  standing_s bigint not null default 0,
  walk_m bigint not null default 0,
  ride_m bigint not null default 0,
  walk_s bigint not null default 0,
  ride_s bigint not null default 0,
  hinto_s bigint not null default 0,
  marks integer not null default 0,
  jeep_rides integer not null default 0,
  bus_rides integer not null default 0,
  train_rides integer not null default 0,
  ferry_rides integer not null default 0,
  tricycle_rides integer not null default 0,
  other_rides integer not null default 0,
  active_days integer not null default 0,
  -- The latest day counted, so the next month's first day is not counted again.
  last_active_day date,
  first_ride_at timestamptz,
  longest_ride_m integer,
  longest_ride_moving_s integer,
  routes_helped integer not null default 0,
  hintuans_helped integer not null default 0,
  updated_at timestamptz not null default now()
);
-- No policy: only the definers below reach it.
alter table private.contributor_retired_totals enable row level security;
revoke all on private.contributor_retired_totals from public, anon, authenticated;

-- One contributor's numbers over their linked, not hidden contributions received
-- in [received_from, received_before). Days on or before `days_after` are already
-- counted elsewhere and are left out of active_days.
create function private.ride_totals(
  who uuid, received_from timestamptz, received_before timestamptz, days_after date
)
returns private.contributor_retired_totals
language sql stable security definer set search_path = '' as $$
  with rides as (
    select c.id, c.started_at, c.vehicle, c.distance_m, c.moving_s, c.standing_s,
      c.walk_m, c.ride_m, c.walk_s, c.ride_s, c.events,
      (c.started_at at time zone 'Asia/Manila')::date as day
    from public.contribution c
    where c.contributor_id = who and c.hidden_at is null
      and c.received_at >= received_from and c.received_at < received_before
  ),
  longest as (
    select r.distance_m, r.moving_s from rides r order by r.distance_m desc, r.moving_s desc limit 1
  ),
  helped as (
    select count(distinct u.subject_id) filter (where u.kind = 'direction')::integer as routes,
      count(distinct u.subject_id) filter (where u.kind = 'hintuan')::integer as hintuans
    from public.contribution_use u join rides r on r.id = u.contribution_id
  )
  select
    who,
    count(*)::integer,
    coalesce(sum(r.distance_m), 0)::bigint,
    coalesce(sum(r.moving_s), 0)::bigint,
    coalesce(sum(r.standing_s), 0)::bigint,
    coalesce(sum(r.walk_m), 0)::bigint,
    coalesce(sum(r.ride_m), 0)::bigint,
    coalesce(sum(r.walk_s), 0)::bigint,
    coalesce(sum(r.ride_s), 0)::bigint,
    (select coalesce(sum(h.seconds), 0) from public.hinto h join rides x on x.id = h.contribution_id)::bigint,
    (select count(*) from rides x, jsonb_array_elements(x.events) e where e ->> 'kind' = 'mark')::integer,
    (count(*) filter (where r.vehicle = 'jeep'))::integer,
    (count(*) filter (where r.vehicle = 'bus'))::integer,
    (count(*) filter (where r.vehicle = 'train'))::integer,
    (count(*) filter (where r.vehicle = 'ferry'))::integer,
    (count(*) filter (where r.vehicle = 'tricycle'))::integer,
    (count(*) filter (where r.vehicle = 'other'))::integer,
    (count(distinct r.day) filter (where days_after is null or r.day > days_after))::integer,
    max(r.day),
    min(r.started_at),
    (select l.distance_m from longest l),
    (select l.moving_s from longest l),
    (select h.routes from helped h),
    (select h.hintuans from helped h),
    now()
  from rides r;
$$;

-- Adds one set of numbers to its contributor's retired totals.
create function private.add_retired_totals(more private.contributor_retired_totals)
returns void language sql security definer set search_path = '' as $$
  insert into private.contributor_retired_totals as t
  select (more).*
  on conflict (contributor_id) do update set
    rides = t.rides + excluded.rides,
    distance_m = t.distance_m + excluded.distance_m,
    moving_s = t.moving_s + excluded.moving_s,
    standing_s = t.standing_s + excluded.standing_s,
    walk_m = t.walk_m + excluded.walk_m,
    ride_m = t.ride_m + excluded.ride_m,
    walk_s = t.walk_s + excluded.walk_s,
    ride_s = t.ride_s + excluded.ride_s,
    hinto_s = t.hinto_s + excluded.hinto_s,
    marks = t.marks + excluded.marks,
    jeep_rides = t.jeep_rides + excluded.jeep_rides,
    bus_rides = t.bus_rides + excluded.bus_rides,
    train_rides = t.train_rides + excluded.train_rides,
    ferry_rides = t.ferry_rides + excluded.ferry_rides,
    tricycle_rides = t.tricycle_rides + excluded.tricycle_rides,
    other_rides = t.other_rides + excluded.other_rides,
    active_days = t.active_days + excluded.active_days,
    last_active_day = greatest(t.last_active_day, excluded.last_active_day),
    first_ride_at = least(t.first_ride_at, excluded.first_ride_at),
    longest_ride_m = case when excluded.longest_ride_m > coalesce(t.longest_ride_m, -1)
      then excluded.longest_ride_m else t.longest_ride_m end,
    longest_ride_moving_s = case when excluded.longest_ride_m > coalesce(t.longest_ride_m, -1)
      then excluded.longest_ride_moving_s else t.longest_ride_moving_s end,
    routes_helped = t.routes_helped + excluded.routes_helped,
    hintuans_helped = t.hintuans_helped + excluded.hintuans_helped,
    updated_at = now();
$$;

-- Each contributor's numbers for one month of contributions (by received_at, in
-- UTC, as retire_month picks them), added to their retired totals. Before the
-- month's rows lose their hintos near the ends and their contributor.
create function private.carry_retired_month(first_day date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  received_from timestamptz := first_day::timestamp at time zone 'UTC';
  received_before timestamptz := (first_day + interval '1 month')::timestamp at time zone 'UTC';
  who uuid;
  counted date;
  month_totals private.contributor_retired_totals;
begin
  for who in
    select distinct c.contributor_id from public.contribution c
    where c.contributor_id is not null and c.hidden_at is null
      and c.received_at >= received_from and c.received_at < received_before
  loop
    select t.last_active_day into counted from private.contributor_retired_totals t
      where t.contributor_id = who;
    month_totals := private.ride_totals(who, received_from, received_before, counted);
    perform private.add_retired_totals(month_totals);
  end loop;
end $$;

revoke all on function private.ride_totals(uuid, timestamptz, timestamptz, date)
  from public, anon, authenticated;
revoke all on function private.add_retired_totals(private.contributor_retired_totals)
  from public, anon, authenticated;
revoke all on function private.carry_retired_month(date) from public, anon, authenticated;

-- As 20261022090000_contribution_use.sql's, with the carry as its first step.
create or replace function private.retire_month(target_month date, min_age_months integer default 24)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  first_day date := date_trunc('month', target_month)::date;
  next_day date := (date_trunc('month', target_month) + interval '1 month')::date;
  piece text := 'point_batch_' || to_char(date_trunc('month', target_month), 'YYYY_MM');
  r record;
  ends jsonb;
  trimmed jsonb;
  contributions integer := 0;
  hintos_deleted integer := 0;
  removed integer;
  months_ahead integer;
begin
  if target_month <> first_day then
    raise exception 'bad_month: pass the first day of a month' using errcode = 'P0001';
  end if;
  if first_day > (date_trunc('month', now() at time zone 'UTC') - make_interval(months => min_age_months))::date then
    raise exception 'too_soon: % is newer than % months', first_day, min_age_months using errcode = 'P0001';
  end if;

  -- Locked before the carry reads them, so a ride deleted meanwhile is neither carried nor kept.
  perform 1 from public.contribution
    where (received_at at time zone 'UTC') >= first_day
      and (received_at at time zone 'UTC') < next_day
      and contributor_id is not null
    for update;
  -- The contributors' lifetime numbers keep what this month's rows are about to lose.
  perform private.carry_retired_month(first_day);

  for r in
    select id, line from public.contribution
    where (received_at at time zone 'UTC') >= first_day
      and (received_at at time zone 'UTC') < next_day
      -- Only retirement nulls contributor_id, so a second run skips a done month.
      and contributor_id is not null
    for update
  loop
    if r.line is not null and jsonb_typeof(r.line -> 'coordinates') = 'array' then
      ends := jsonb_build_array(r.line -> 'coordinates' -> 0, r.line -> 'coordinates' -> -1);
      delete from public.hinto h
        where h.contribution_id = r.id
          and exists (
            select 1 from jsonb_array_elements(ends) e
            where private.distance_m(h.lat, h.lng,
              (e ->> 1)::double precision, (e ->> 0)::double precision) <= 200
          );
      get diagnostics removed = row_count;
      hintos_deleted := hintos_deleted + removed;
    end if;
    trimmed := private.trim_line_ends(r.line, 200);
    update public.contribution set
      line = trimmed,
      west = (select min((c -> 0)::text::double precision) from jsonb_array_elements(trimmed -> 'coordinates') c),
      east = (select max((c -> 0)::text::double precision) from jsonb_array_elements(trimmed -> 'coordinates') c),
      south = (select min((c -> 1)::text::double precision) from jsonb_array_elements(trimmed -> 'coordinates') c),
      north = (select max((c -> 1)::text::double precision) from jsonb_array_elements(trimmed -> 'coordinates') c),
      start_name = null, end_name = null, description = null,
      contributor_id = null
      where id = r.id;
    contributions := contributions + 1;
  end loop;

  if to_regclass(format('public.%I', piece)) is not null then
    execute format('drop table public.%I', piece);
  end if;
  -- Anything that landed in the default piece for this month.
  delete from public.point_batch_default where point_batch_default.month = first_day;

  months_ahead := coalesce((
    extract(year from private.last_piece_month()) * 12 + extract(month from private.last_piece_month())
    - extract(year from now() at time zone 'UTC') * 12 - extract(month from now() at time zone 'UTC')
  )::integer, 0);
  if months_ahead < 6 then
    raise warning 'fewer than six monthly pieces ahead: run private.add_months(12)';
  end if;

  return jsonb_build_object(
    'month', first_day,
    'contributions', contributions,
    'hintos_deleted', hintos_deleted
  );
end $$;
revoke all on function private.retire_month(date, integer) from public, anon, authenticated;

-- ------------------------------------------------------------------- claim

-- As 20261024090000_contributor_accounts.sql's, with the retired totals moved too.
create or replace function public.finish_claim(token uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  who uuid := (select auth.uid());
  t private.claim_token;
  moved integer;
  theirs_retired private.contributor_retired_totals;
begin
  if who is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if not (select private.is_account()) then
    raise exception 'not_an_account' using errcode = '42501';
  end if;

  select * into t from private.claim_token c where c.token = finish_claim.token for update;
  if not found then
    raise exception 'bad_token' using errcode = 'P0001';
  end if;
  if t.used_at is not null then
    if t.claimed_by = who then
      return 0;
    end if;
    raise exception 'bad_token' using errcode = 'P0001';
  end if;
  if t.made_at < now() - interval '10 minutes' then
    raise exception 'token_expired' using errcode = 'P0001';
  end if;
  -- Still the anonymous identity it was made for: an upgraded one is an account.
  if t.anonymous_id = who or not exists (
    select 1 from auth.users where id = t.anonymous_id and is_anonymous
  ) then
    raise exception 'bad_token' using errcode = 'P0001';
  end if;

  insert into public.contributor (id) values (who) on conflict (id) do nothing;
  -- Held so a save racing the claim cannot slip a contribution in under the
  -- row that is about to go.
  perform 1 from public.contributor where id = t.anonymous_id for update;

  update public.contributor mine
    set blocked_at = theirs.blocked_at, blocked_by = theirs.blocked_by, block_note = theirs.block_note
    from public.contributor theirs
    where mine.id = who and mine.blocked_at is null
      and theirs.id = t.anonymous_id and theirs.blocked_at is not null;

  update public.contribution set contributor_id = who where contributor_id = t.anonymous_id;
  get diagnostics moved = row_count;
  -- Before the row goes: its retired totals go with it (on delete cascade).
  select * into theirs_retired from private.contributor_retired_totals r
    where r.contributor_id = t.anonymous_id;
  if found then
    theirs_retired.contributor_id := who;
    perform private.add_retired_totals(theirs_retired);
  end if;
  delete from public.contributor where id = t.anonymous_id;

  update private.claim_token set used_at = now(), claimed_by = who where private.claim_token.token = t.token;
  return moved;
end $$;
revoke all on function public.finish_claim(uuid) from public, anon;
grant execute on function public.finish_claim(uuid) to authenticated;

-- ------------------------------------------------------------- my stats

create function public.get_my_stats()
returns table (
  rides integer,
  distance_m bigint,
  moving_s bigint,
  standing_s bigint,
  walk_m bigint,
  ride_m bigint,
  walk_s bigint,
  ride_s bigint,
  hinto_s bigint,
  marks integer,
  jeep_rides integer,
  bus_rides integer,
  train_rides integer,
  ferry_rides integer,
  tricycle_rides integer,
  other_rides integer,
  active_days integer,
  first_ride_at timestamptz,
  longest_ride_m integer,
  longest_ride_moving_s integer,
  routes_helped integer,
  hintuans_helped integer
)
language plpgsql stable security definer set search_path = '' as $$
declare
  who uuid := (select auth.uid());
  retired private.contributor_retired_totals;
  live private.contributor_retired_totals;
  is_live_longer boolean;
begin
  if who is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  select * into retired from private.contributor_retired_totals t where t.contributor_id = who;
  live := private.ride_totals(who, '-infinity', 'infinity', retired.last_active_day);
  is_live_longer := live.longest_ride_m > coalesce(retired.longest_ride_m, -1);
  return query select
    live.rides + coalesce(retired.rides, 0),
    live.distance_m + coalesce(retired.distance_m, 0),
    live.moving_s + coalesce(retired.moving_s, 0),
    live.standing_s + coalesce(retired.standing_s, 0),
    live.walk_m + coalesce(retired.walk_m, 0),
    live.ride_m + coalesce(retired.ride_m, 0),
    live.walk_s + coalesce(retired.walk_s, 0),
    live.ride_s + coalesce(retired.ride_s, 0),
    live.hinto_s + coalesce(retired.hinto_s, 0),
    live.marks + coalesce(retired.marks, 0),
    live.jeep_rides + coalesce(retired.jeep_rides, 0),
    live.bus_rides + coalesce(retired.bus_rides, 0),
    live.train_rides + coalesce(retired.train_rides, 0),
    live.ferry_rides + coalesce(retired.ferry_rides, 0),
    live.tricycle_rides + coalesce(retired.tricycle_rides, 0),
    live.other_rides + coalesce(retired.other_rides, 0),
    live.active_days + coalesce(retired.active_days, 0),
    least(live.first_ride_at, retired.first_ride_at),
    case when is_live_longer then live.longest_ride_m else retired.longest_ride_m end,
    case when is_live_longer then live.longest_ride_moving_s else retired.longest_ride_moving_s end,
    live.routes_helped + coalesce(retired.routes_helped, 0),
    live.hintuans_helped + coalesce(retired.hintuans_helped, 0);
end $$;
revoke all on function public.get_my_stats() from public, anon;
grant execute on function public.get_my_stats() to authenticated;
-- <<< supabase/migrations/20261031090000_account_stats.sql

-- 2. After: who can run what, and the table out of reach.
do $$
begin
  if exists (
    select 1 from pg_proc
    where oid in ('public.get_my_stats()'::regprocedure, 'public.finish_claim(uuid)'::regprocedure)
      and (not prosecdef or not coalesce(proconfig @> array['search_path=""'], false)
           or not has_function_privilege('authenticated', oid, 'execute')
           or has_function_privilege('anon', oid, 'execute')
           or has_function_privilege('public', oid, 'execute'))
  ) then
    raise exception 'account_stats: get_my_stats or finish_claim is not a definer with a pinned path for authenticated only. Nothing was changed.';
  end if;
  if exists (
    select 1 from pg_proc
    where pronamespace = 'private'::regnamespace
      and proname in ('ride_totals', 'add_retired_totals', 'carry_retired_month', 'retire_month')
      and (not prosecdef or not coalesce(proconfig @> array['search_path=""'], false)
           or has_function_privilege('authenticated', oid, 'execute')
           or has_function_privilege('anon', oid, 'execute')
           or has_function_privilege('public', oid, 'execute'))
  ) then
    raise exception 'account_stats: a private helper is runnable through the API. Nothing was changed.';
  end if;
  if has_table_privilege('anon', 'private.contributor_retired_totals', 'select')
     or has_table_privilege('authenticated', 'private.contributor_retired_totals', 'select')
     or not (select relrowsecurity from pg_class where oid = 'private.contributor_retired_totals'::regclass) then
    raise exception 'account_stats: private.contributor_retired_totals is reachable. Nothing was changed.';
  end if;
  if (select prosecdef from pg_proc where oid = 'public.save_contribution(jsonb)'::regprocedure)
     or has_function_privilege('anon', 'public.save_contribution(jsonb)', 'execute') then
    raise exception 'account_stats: save_contribution is not the invoker for authenticated only. Nothing was changed.';
  end if;
end $$;

-- 3. The ledger row, once.
insert into supabase_migrations.schema_migrations (version, name, statements)
select greatest(to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
                (select (max(version)::bigint + 1)::text from supabase_migrations.schema_migrations
                 where version ~ '^[0-9]{14}$')),
       'account_stats', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'account_stats');

commit;
