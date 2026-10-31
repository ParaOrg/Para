-- ParaPo — undo the contribution_fare migration. Refuses, changing nothing,
-- while any contribution holds a fare or any retired totals count one: dropped,
-- they cannot be made again. Puts back save_contribution, private.ride_totals,
-- private.add_retired_totals and public.get_my_stats as
-- 20261031090000_account_stats made them. An app that sends fare_php keeps
-- saving after it: that save_contribution ignores the key. Safe to run twice.
begin;
do $$
begin
  -- Nested: a statement naming a missing column is planned only once it is known to exist.
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'contribution' and column_name = 'fare_php') then
    if exists (select 1 from public.contribution where fare_php is not null) then
      raise exception 'contribution_fare revert: a contribution holds a fare, so it is not undone. Nothing was changed.';
    end if;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'private'
             and table_name = 'contributor_retired_totals' and column_name = 'fare_recordings') then
    if exists (select 1 from private.contributor_retired_totals where fare_recordings > 0) then
      raise exception 'contribution_fare revert: retired totals count a fare, so it is not undone. Nothing was changed.';
    end if;
  end if;
end $$;

-- As 20261031090000_account_stats.sql made them.
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

alter table public.contribution drop column if exists fare_php;
alter table private.contributor_retired_totals
  drop column if exists fare_php_total, drop column if exists fare_recordings;

create or replace function private.ride_totals(
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

create or replace function private.add_retired_totals(more private.contributor_retired_totals)
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

drop function if exists public.get_my_stats();
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

delete from supabase_migrations.schema_migrations where name = 'contribution_fare';
commit;
