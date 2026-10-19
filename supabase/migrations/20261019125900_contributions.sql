-- ParaPo — contributions: a phone uploads its saved recordings, the studio reads them
--
-- The tables of .scratch/contribute/database.md §3 that the first upload needs,
-- with that section's columns, row security (§4) and caps (§5):
--   contributor   one row per phone (its anonymous auth user)
--   contribution  one row per saved recording, its id made on the phone
--   point_batch   the raw points, a few minutes per row, partitioned by month
--   hinto         each time the ride stood still
--   save_contribution(jsonb)  the whole recording in one transaction; a resend
--                 of the same id answers 'already saved' and writes nothing
--
-- Who reads and writes:
--   the phone     inserts its own rows; reads only its own contributions (so it
--                 can delete them and say what arrived); deletes its own
--                 contributions, and their points and hintos go with them
--   editors       read everything here; write nothing yet
--   (a phone also reads its own contributor row, never another's)
--   anon          nothing at all: the nightly publish can never see a contribution
--
-- Left for later migrations: contribution_use, editors hiding and blocking, the
-- monthly retention step, dropping gps_session.

-- ------------------------------------------------------------------ tables

create table public.contributor (
  id uuid primary key references auth.users (id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  blocked_at timestamptz,
  blocked_by uuid references auth.users (id) on delete set null,
  block_note text check (char_length(block_note) <= 500)
);
create index contributor_blocked_by on public.contributor (blocked_by) where blocked_by is not null;

create table public.contribution (
  id uuid primary key,
  contributor_id uuid references public.contributor (id) on delete cascade,
  format_version smallint not null,
  rules_version smallint not null,
  consent_version smallint not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  sent_at timestamptz not null,
  received_at timestamptz not null default now(),
  vehicle text check (vehicle in ('jeep', 'bus', 'train', 'ferry', 'tricycle', 'other')),
  start_name text check (char_length(start_name) <= 80),
  end_name text check (char_length(end_name) <= 80),
  description text check (char_length(description) <= 1000),
  distance_m integer not null check (distance_m >= 0),
  moving_s integer not null check (moving_s >= 0),
  standing_s integer not null check (standing_s >= 0),
  lost_s integer not null check (lost_s >= 0),
  point_count integer not null check (point_count between 0 and 14400),
  events jsonb not null check (jsonb_typeof(events) = 'array' and jsonb_array_length(events) <= 500),
  gaps jsonb not null check (jsonb_typeof(gaps) = 'array' and jsonb_array_length(gaps) <= 500),
  line jsonb check (
    line is null
    or (line ->> 'type' = 'LineString' and octet_length(line::text) <= 200000)
  ),
  west double precision check (west between 116 and 127),
  south double precision check (south between 4 and 22),
  east double precision check (east between 116 and 127),
  north double precision check (north between 4 and 22),
  hidden_at timestamptz,
  hidden_by uuid references auth.users (id) on delete set null,
  hidden_note text check (char_length(hidden_note) <= 500),
  check (ended_at > started_at and ended_at <= started_at + interval '6 hours'),
  check (west <= east and south <= north)
);
create index contribution_contributor on public.contribution (contributor_id, received_at);
create index contribution_received on public.contribution (received_at);
create index contribution_hidden_by on public.contribution (hidden_by) where hidden_by is not null;

create table public.point_batch (
  contribution_id uuid not null references public.contribution (id) on delete cascade,
  seq smallint not null check (seq >= 0),
  month date not null,
  first_at timestamptz not null,
  first_lat integer not null check (first_lat between 4000000 and 22000000),
  first_lng integer not null check (first_lng between 116000000 and 127000000),
  point_count smallint not null check (point_count between 1 and 600),
  dt_ms integer[] not null,
  dlat integer[] not null,
  dlng integer[] not null,
  accuracy_m smallint[] not null,
  speed_cms smallint[],
  primary key (contribution_id, seq, month),
  check (
    cardinality(dt_ms) = point_count and cardinality(dlat) = point_count
    and cardinality(dlng) = point_count and cardinality(accuracy_m) = point_count
    and (speed_cms is null or cardinality(speed_cms) = point_count)
  )
) partition by range (month);

-- A piece per month ahead to the end of 2028, and a default that should stay
-- empty. Dropping a month later is a drop table, not a slow delete.
do $$
declare m date := date '2026-10-01';
begin
  while m < date '2029-01-01' loop
    execute format(
      'create table public.%I partition of public.point_batch for values from (%L) to (%L)',
      'point_batch_' || to_char(m, 'YYYY_MM'), m, (m + interval '1 month')::date
    );
    -- Reached only through point_batch, whose rules apply; on here too, so a
    -- piece read by its own name answers no one.
    execute format('alter table public.%I enable row level security', 'point_batch_' || to_char(m, 'YYYY_MM'));
    m := (m + interval '1 month')::date;
  end loop;
end $$;
create table public.point_batch_default partition of public.point_batch default;
alter table public.point_batch_default enable row level security;

create table public.hinto (
  contribution_id uuid not null references public.contribution (id) on delete cascade,
  seq smallint not null check (seq >= 0),
  started_at timestamptz not null,
  seconds integer not null check (seconds between 1 and 21600),
  lat double precision not null check (lat between 4 and 22),
  lng double precision not null check (lng between 116 and 127),
  -- About 22 m across: "many hintos at one spot" is a group by cell.
  cell bigint generated always as (
    floor(lat * 5000)::bigint * 1000000 + floor(lng * 5000)::bigint
  ) stored,
  rules_version smallint not null,
  primary key (contribution_id, seq)
);
create index hinto_cell on public.hinto (cell);

-- ----------------------------------------------------------------- helpers

-- A policy runs as the phone, which cannot read contributor; without a definer
-- the block check would see no row and pass.
create function private.can_contribute()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and not exists (
    select 1 from public.contributor
    where id = (select auth.uid()) and blocked_at is not null
  );
$$;
revoke all on function private.can_contribute() from public, anon;
grant execute on function private.can_contribute() to authenticated;

-- Server-owned columns are stamped here, whatever the phone sent.
create function private.contributor_stamp()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.first_seen_at := now();
  new.blocked_at := null;
  new.blocked_by := null;
  new.block_note := null;
  return new;
end $$;

-- Definer: the day cap counts the phone's rows, including any an editor hid.
create function private.contribution_stamp()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.contributor_id := (select auth.uid());
  new.received_at := now();
  new.hidden_at := null;
  new.hidden_by := null;
  new.hidden_note := null;
  if (
    select count(*) from public.contribution
    where contributor_id = new.contributor_id and received_at > now() - interval '24 hours'
  ) >= 20 then
    raise exception 'day_cap: 20 contributions in 24 hours' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- Every point inside the Philippines, each after the one before, and no two
-- points further apart than 150 km/h. The phone drops points that would break
-- these before it sends, so a refusal here means the rules disagree.
create function private.point_batch_stamp()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  lat bigint := new.first_lat;
  lng bigint := new.first_lng;
  total integer;
  metres double precision;
begin
  select date_trunc('month', received_at)::date into new.month
    from public.contribution where id = new.contribution_id;
  if new.month is null then
    raise exception 'no_contribution' using errcode = 'P0001';
  end if;
  if new.dt_ms[1] <> 0 or new.dlat[1] <> 0 or new.dlng[1] <> 0 then
    raise exception 'bad_points: the first point is the batch''s own' using errcode = 'P0001';
  end if;
  for i in 2 .. new.point_count loop
    if new.dt_ms[i] is null or new.dt_ms[i] <= 0 then
      raise exception 'bad_points: point % is not after the one before', i using errcode = 'P0001';
    end if;
    lat := lat + new.dlat[i];
    lng := lng + new.dlng[i];
    if lat not between 4000000 and 22000000 or lng not between 116000000 and 127000000 then
      raise exception 'bad_points: point % is outside the Philippines', i using errcode = 'P0001';
    end if;
    metres := 0.11132 * sqrt(
      power(new.dlat[i], 2) + power(new.dlng[i] * cos(radians(lat / 1e6)), 2)
    );
    if metres / (new.dt_ms[i] / 1000.0) > 150 / 3.6 then
      raise exception 'bad_points: point % is faster than 150 km/h', i using errcode = 'P0001';
    end if;
  end loop;
  select coalesce(sum(point_count), 0) + new.point_count into total
    from public.point_batch where contribution_id = new.contribution_id;
  if total > 14400 then
    raise exception 'point_cap: more than 14400 points' using errcode = 'P0001';
  end if;
  return new;
end $$;

create function private.hinto_cap()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.hinto where contribution_id = new.contribution_id) >= 2000 then
    raise exception 'hinto_cap: more than 2000 hintos' using errcode = 'P0001';
  end if;
  return new;
end $$;

revoke all on function private.contributor_stamp() from public, anon, authenticated;
revoke all on function private.contribution_stamp() from public, anon, authenticated;
revoke all on function private.point_batch_stamp() from public, anon, authenticated;
revoke all on function private.hinto_cap() from public, anon, authenticated;

create trigger contributor_stamp before insert on public.contributor
  for each row execute function private.contributor_stamp();
create trigger contribution_stamp before insert on public.contribution
  for each row execute function private.contribution_stamp();
create trigger point_batch_stamp before insert on public.point_batch
  for each row execute function private.point_batch_stamp();
create trigger hinto_cap before insert on public.hinto
  for each row execute function private.hinto_cap();

-- ------------------------------------------------------------ row security

alter table public.contributor enable row level security;
alter table public.contribution enable row level security;
alter table public.point_batch enable row level security;
alter table public.hinto enable row level security;

revoke all on public.contributor, public.contribution, public.point_batch, public.hinto
  from anon, authenticated;
grant select, insert on public.contributor to authenticated;
grant select, insert, delete on public.contribution to authenticated;
grant select, insert on public.point_batch, public.hinto to authenticated;

create policy "phone adds itself" on public.contributor for insert to authenticated
  with check (id = (select auth.uid()));
-- Its own row too: insert ... on conflict checks the row against the read rules.
create policy "phone or editor reads contributors" on public.contributor for select to authenticated
  using (id = (select auth.uid()) or (select private.is_editor()));

create policy "phone adds its own" on public.contribution for insert to authenticated
  with check (contributor_id = (select auth.uid()) and (select private.can_contribute()));
create policy "phone or editor reads" on public.contribution for select to authenticated
  using (contributor_id = (select auth.uid()) or (select private.is_editor()));
create policy "phone deletes its own" on public.contribution for delete to authenticated
  using (contributor_id = (select auth.uid()));

create policy "phone adds points to its own" on public.point_batch for insert to authenticated
  with check (
    (select private.can_contribute())
    and exists (
      select 1 from public.contribution c
      where c.id = contribution_id and c.contributor_id = (select auth.uid())
    )
  );
create policy "editors read points" on public.point_batch for select to authenticated
  using ((select private.is_editor()));

create policy "phone adds hintos to its own" on public.hinto for insert to authenticated
  with check (
    (select private.can_contribute())
    and exists (
      select 1 from public.contribution c
      where c.id = contribution_id and c.contributor_id = (select auth.uid())
    )
  );
create policy "editors read hintos" on public.hinto for select to authenticated
  using ((select private.is_editor()));

-- -------------------------------------------------------------------- save

-- Security invoker: row security and the triggers apply exactly as to a direct
-- insert. One transaction, so a recording is stored whole or not at all.
create function public.save_contribution(recording jsonb)
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
revoke all on function public.save_contribution(jsonb) from public, anon;
grant execute on function public.save_contribution(jsonb) to authenticated;
