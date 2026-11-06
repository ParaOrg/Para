-- ParaPo — the public and private schemas as the live project has them: schema only, no rows.
-- Written by supabase/verify/schema-snapshot.sh --write from every migration the ledger lists,
-- in its order. For reading what the database is now; never apply it. Each change still goes
-- through its own migration in supabase/migrations/.
--
-- PostgreSQL database dump
--



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: private; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA private;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: route_confidence; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.route_confidence AS ENUM (
    'drawn',
    'verified'
);


--
-- Name: stop_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stop_kind AS ENUM (
    'terminal',
    'hintuan'
);


--
-- Name: transport_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transport_mode AS ENUM (
    'jeepney',
    'e_jeepney',
    'uv_express',
    'bus',
    'p2p',
    'tricycle',
    'lrt',
    'mrt',
    'ferry'
);


--
-- Name: add_months(integer); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.add_months(n integer) RETURNS date
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  m date;
begin
  if n < 1 then
    raise exception 'bad_months: n must be at least 1' using errcode = 'P0001';
  end if;
  m := coalesce(
    (private.last_piece_month() + interval '1 month')::date,
    date_trunc('month', now() at time zone 'UTC')::date
  );
  for i in 1 .. n loop
    execute format(
      'create table public.%I partition of public.point_batch for values from (%L) to (%L)',
      'point_batch_' || to_char(m, 'YYYY_MM'), m, (m + interval '1 month')::date
    );
    execute format('alter table public.%I enable row level security', 'point_batch_' || to_char(m, 'YYYY_MM'));
    m := (m + interval '1 month')::date;
  end loop;
  return (m - interval '1 month')::date;
end $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: contributor_retired_totals; Type: TABLE; Schema: private; Owner: -
--

CREATE TABLE private.contributor_retired_totals (
    contributor_id uuid NOT NULL,
    rides integer DEFAULT 0 NOT NULL,
    distance_m bigint DEFAULT 0 NOT NULL,
    moving_s bigint DEFAULT 0 NOT NULL,
    standing_s bigint DEFAULT 0 NOT NULL,
    walk_m bigint DEFAULT 0 NOT NULL,
    ride_m bigint DEFAULT 0 NOT NULL,
    walk_s bigint DEFAULT 0 NOT NULL,
    ride_s bigint DEFAULT 0 NOT NULL,
    hinto_s bigint DEFAULT 0 NOT NULL,
    marks integer DEFAULT 0 NOT NULL,
    jeep_rides integer DEFAULT 0 NOT NULL,
    bus_rides integer DEFAULT 0 NOT NULL,
    train_rides integer DEFAULT 0 NOT NULL,
    ferry_rides integer DEFAULT 0 NOT NULL,
    tricycle_rides integer DEFAULT 0 NOT NULL,
    other_rides integer DEFAULT 0 NOT NULL,
    active_days integer DEFAULT 0 NOT NULL,
    last_active_day date,
    first_ride_at timestamp with time zone,
    longest_ride_m integer,
    longest_ride_moving_s integer,
    routes_helped integer DEFAULT 0 NOT NULL,
    hintuans_helped integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fare_php_total numeric(12,2) DEFAULT 0 NOT NULL,
    fare_recordings integer DEFAULT 0 NOT NULL,
    e_jeep_rides integer DEFAULT 0 NOT NULL,
    uv_express_rides integer DEFAULT 0 NOT NULL
);


--
-- Name: add_retired_totals(private.contributor_retired_totals); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.add_retired_totals(more private.contributor_retired_totals) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
    fare_php_total = t.fare_php_total + excluded.fare_php_total,
    fare_recordings = t.fare_recordings + excluded.fare_recordings,
    e_jeep_rides = t.e_jeep_rides + excluded.e_jeep_rides,
    uv_express_rides = t.uv_express_rides + excluded.uv_express_rides,
    updated_at = now();
$$;


--
-- Name: apply_draft(uuid); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.apply_draft(p_draft uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  d public.draft;
  r jsonb;
  dir jsonb;
  link jsonb;
  current_revision bigint;
  existing uuid[];
  dir_ids uuid[];
  written uuid[];
  c text;
  -- Who the published columns name: the draft's maker, else (a draft whose
  -- maker's account is gone) the editor publishing it; and whoever saved it last.
  publisher uuid;
  saver uuid;
begin
  perform private.require_editor();

  select * into d from public.draft where id = p_draft for update;
  if not found then
    -- Approved or discarded already: a retry after a lost answer lands here.
    return jsonb_build_object('code', 'no_draft');
  end if;
  if not private.payload_ok(d.kind, d.payload) then
    return jsonb_build_object('code', 'bad_payload');
  end if;
  publisher := coalesce(d.editor_id, (select auth.uid()));
  saver := coalesce(d.last_saved_by, d.editor_id);

  -- Every row this approval writes or its triggers touch, locked in the
  -- header's order before anything is written. The subject's lock is the
  -- conflict check's: a take-down or another approval of it waits for this
  -- transaction, or this for it.
  if d.kind = 'route' then
    select array_agg((e ->> 'id')::uuid) into dir_ids
    from jsonb_array_elements(d.payload -> 'directions') e;
    -- The route, and the routes whose directions borrow from its own (an
    -- emptied direction clears their borrow, bumping their revision).
    perform private.lock_rows(
      array[d.subject_id] || array(
        select distinct v.route_id from public.route_variant v
        where v.borrowed_from = any(coalesce(dir_ids, '{}'::uuid[]))),
      null);
    -- Then its hotspots: linked now, linked by the payload, its ends.
    perform private.lock_rows(null, array(
      select l.stop_id from public.route_stop l
      join public.route_variant v on v.id = l.route_variant_id
      where v.route_id = d.subject_id
      union
      select (l ->> 'stop_id')::uuid
      from jsonb_array_elements(d.payload -> 'directions') e, jsonb_array_elements(e -> 'links') l
      union
      select unnest(array[r0.head_stop_id, r0.tail_stop_id]) from public.route r0 where r0.id = d.subject_id
      union
      select (d.payload -> 'route' ->> k)::uuid from unnest(array['head_stop_id', 'tail_stop_id']) k
      where jsonb_typeof(d.payload -> 'route' -> k) = 'string'));
  else
    -- The routes of its links now and in the payload, then the hotspot.
    perform private.lock_rows(
      array(
        select v.route_id from public.route_stop l
        join public.route_variant v on v.id = l.route_variant_id
        where l.stop_id = d.subject_id
        union
        select v.route_id from public.route_variant v
        where v.id in (select (l ->> 'route_variant_id')::uuid from jsonb_array_elements(d.payload -> 'links') l)),
      array[d.subject_id]);
  end if;

  if d.is_new then
    if d.kind = 'route' then
      if exists (select 1 from public.route where id = d.subject_id) then
        return jsonb_build_object('code', 'subject_exists');
      end if;
    else
      if exists (select 1 from public.stop where id = d.subject_id) then
        return jsonb_build_object('code', 'subject_exists');
      end if;
    end if;
  elsif d.kind = 'route' then
    select revision into current_revision from public.route where id = d.subject_id;
    if not found then
      return jsonb_build_object('code', 'subject_gone');
    end if;
    if current_revision is distinct from d.base_revision then
      return jsonb_build_object('code', 'conflict', 'current_revision', current_revision);
    end if;
  else
    select revision into current_revision from public.stop where id = d.subject_id;
    if not found then
      return jsonb_build_object('code', 'subject_gone');
    end if;
    if current_revision is distinct from d.base_revision then
      return jsonb_build_object('code', 'conflict', 'current_revision', current_revision);
    end if;
  end if;

  if d.kind = 'route' then
    r := d.payload -> 'route';
    if r is null or jsonb_typeof(d.payload -> 'directions') <> 'array' then
      return jsonb_build_object('code', 'bad_payload');
    end if;

    -- The payload is the whole route: every direction row it has must be in
    -- it. The base check means the set is what the drafter saw, so a missing
    -- id is a malformed draft, not a delete request.
    select array_agg(id) into existing from public.route_variant where route_id = d.subject_id;
    if coalesce(existing, '{}'::uuid[]) <> coalesce(dir_ids, '{}'::uuid[])
       and not coalesce(existing, '{}'::uuid[]) <@ coalesce(dir_ids, '{}'::uuid[]) then
      return jsonb_build_object('code', 'payload_incomplete');
    end if;
    if exists (
      select 1 from public.route_variant v
      where v.id = any(coalesce(dir_ids, '{}'::uuid[])) and v.route_id <> d.subject_id
    ) then
      return jsonb_build_object('code', 'direction_elsewhere');
    end if;

    if d.is_new then
      insert into public.route (
        id, owner_id, signboard, mode, fare_note, via, head_stop_id, tail_stop_id, is_loop, status,
        published_at, published_by, last_saved_at, last_saved_by
      )
      values (
        d.subject_id,
        (select auth.uid()),
        r ->> 'signboard',
        (r ->> 'mode')::public.transport_mode,
        r ->> 'fare_note',
        r ->> 'via',
        (r ->> 'head_stop_id')::uuid,
        (r ->> 'tail_stop_id')::uuid,
        coalesce((r ->> 'is_loop')::boolean, false),
        'approved',
        now(), publisher, d.updated_at, saver
      );
    else
      update public.route set
        signboard = r ->> 'signboard',
        mode = (r ->> 'mode')::public.transport_mode,
        fare_note = r ->> 'fare_note',
        via = r ->> 'via',
        head_stop_id = case when (r ->> 'is_loop')::boolean then null else (r ->> 'head_stop_id')::uuid end,
        tail_stop_id = case when (r ->> 'is_loop')::boolean then null else (r ->> 'tail_stop_id')::uuid end,
        status = 'approved',
        published_at = now(),
        published_by = publisher,
        last_saved_at = d.updated_at,
        last_saved_by = saver
      where id = d.subject_id;
    end if;

    for dir in select * from jsonb_array_elements(d.payload -> 'directions') loop
      insert into public.route_variant (
        id, route_id, owner_id, direction_name, origin_terminal, destination_terminal,
        control_points, segments, shape, overview, confidence, reversed,
        borrowed_from, borrowed_part, borrowed_m, signboards
      ) values (
        (dir ->> 'id')::uuid,
        d.subject_id,
        (select auth.uid()),
        dir ->> 'direction_name',
        dir ->> 'origin_terminal',
        dir ->> 'destination_terminal',
        coalesce(dir -> 'control_points', '[]'::jsonb),
        coalesce(dir -> 'segments', '[]'::jsonb),
        -- jsonb 'null' is not SQL null: an emptied slot is SQL NULL as the
        -- live writes store it.
        nullif(dir -> 'shape', 'null'::jsonb),
        nullif(dir -> 'overview', 'null'::jsonb),
        coalesce(dir ->> 'confidence', 'drawn')::public.route_confidence,
        coalesce((dir ->> 'reversed')::boolean, false),
        (dir ->> 'borrowed_from')::uuid,
        dir ->> 'borrowed_part',
        (dir ->> 'borrowed_m')::float8,
        private.text_list(dir -> 'signboards')
      )
      on conflict (id) do update set
        direction_name = excluded.direction_name,
        origin_terminal = excluded.origin_terminal,
        destination_terminal = excluded.destination_terminal,
        control_points = excluded.control_points,
        segments = excluded.segments,
        shape = excluded.shape,
        overview = excluded.overview,
        confidence = excluded.confidence,
        reversed = excluded.reversed,
        borrowed_from = excluded.borrowed_from,
        borrowed_part = excluded.borrowed_part,
        borrowed_m = excluded.borrowed_m,
        signboards = excluded.signboards;

      -- Only the links that differ are written: each link write bumps its
      -- hotspot's revision, so rewriting an unchanged one would make every
      -- draft of that hotspot answer conflict for nothing. A hotspot listed
      -- twice is refused, as the primary key refused it when every link was
      -- rewritten; raised, so the handler undoes what was already written.
      if exists (
        select 1 from jsonb_array_elements(dir -> 'links') l
        group by (l ->> 'stop_id')::uuid having count(*) > 1
      ) then
        raise exception 'A hotspot is listed twice in one direction.'
          using errcode = 'unique_violation', constraint = 'route_stop_pkey';
      end if;
      delete from public.route_stop s
      where s.route_variant_id = (dir ->> 'id')::uuid
        and not exists (
          select 1 from jsonb_array_elements(dir -> 'links') l
          where (l ->> 'stop_id')::uuid = s.stop_id
            and (l ->> 'stop_sequence')::integer = s.stop_sequence);
      insert into public.route_stop (route_variant_id, stop_id, stop_sequence)
      select (dir ->> 'id')::uuid, (l ->> 'stop_id')::uuid, (l ->> 'stop_sequence')::integer
      from jsonb_array_elements(dir -> 'links') l
      where not exists (
        select 1 from public.route_stop s
        where s.route_variant_id = (dir ->> 'id')::uuid
          and s.stop_id = (l ->> 'stop_id')::uuid
          and s.stop_sequence = (l ->> 'stop_sequence')::integer);

      -- An emptied direction forgets who borrowed it, as deleteDirection does.
      if coalesce(dir -> 'shape', 'null'::jsonb) = 'null'::jsonb then
        update public.route_variant
        set borrowed_from = null, borrowed_part = null, borrowed_m = null
        where borrowed_from = (dir ->> 'id')::uuid;
      end if;
    end loop;

    -- Every direction emptied is how the editor deletes the route's last
    -- line: as deleteDirection does, the route comes down — taken_down, so
    -- the log records it and its ends stop counting — not approved empty.
    if not exists (
      select 1 from public.route_variant
      where route_id = d.subject_id and shape is not null
    ) then
      update public.route set status = 'taken_down' where id = d.subject_id;
    end if;

  else  -- hotspot
    r := d.payload -> 'stop';
    if r is null or jsonb_typeof(d.payload -> 'links') is distinct from 'array' then
      return jsonb_build_object('code', 'bad_payload');
    end if;

    if d.is_new then
      insert into public.stop (
        id, owner_id, name, point, kind, area, note, informal, aliases, line, status,
        published_at, published_by, last_saved_at, last_saved_by
      )
      values (
        d.subject_id,
        (select auth.uid()),
        r ->> 'name',
        nullif(r -> 'point', 'null'::jsonb),
        coalesce(r ->> 'kind', 'hintuan')::public.stop_kind,
        nullif(r -> 'area', 'null'::jsonb),
        r ->> 'note',
        r ->> 'informal',
        private.text_list(r -> 'aliases'),
        r ->> 'line',
        'approved',
        now(), publisher, d.updated_at, saver
      );
    else
      update public.stop set
        name = r ->> 'name',
        point = nullif(r -> 'point', 'null'::jsonb),
        kind = coalesce(r ->> 'kind', 'hintuan')::public.stop_kind,
        area = nullif(r -> 'area', 'null'::jsonb),
        note = r ->> 'note',
        informal = r ->> 'informal',
        aliases = private.text_list(r -> 'aliases'),
        line = r ->> 'line',
        status = 'approved',
        published_at = now(),
        published_by = publisher,
        last_saved_at = d.updated_at,
        last_saved_by = saver
      where id = d.subject_id;
    end if;

    -- As for a route: only the links that differ, so an unchanged link
    -- bumps no route's revision.
    if exists (
      select 1 from jsonb_array_elements(d.payload -> 'links') l
      group by (l ->> 'route_variant_id')::uuid having count(*) > 1
    ) then
      raise exception 'A direction is listed twice for one hotspot.'
        using errcode = 'unique_violation', constraint = 'route_stop_pkey';
    end if;
    delete from public.route_stop s
    where s.stop_id = d.subject_id
      and not exists (
        select 1 from jsonb_array_elements(d.payload -> 'links') l
        where (l ->> 'route_variant_id')::uuid = s.route_variant_id
          and (l ->> 'stop_sequence')::integer = s.stop_sequence);
    insert into public.route_stop (route_variant_id, stop_id, stop_sequence)
    select (l ->> 'route_variant_id')::uuid, d.subject_id, (l ->> 'stop_sequence')::integer
    from jsonb_array_elements(d.payload -> 'links') l
    where not exists (
      select 1 from public.route_stop s
      where s.stop_id = d.subject_id
        and s.route_variant_id = (l ->> 'route_variant_id')::uuid
        and s.stop_sequence = (l ->> 'stop_sequence')::integer);
  end if;

  delete from public.draft where id = d.id;
  return jsonb_build_object('code', 'approved');
exception
  when check_violation or unique_violation or foreign_key_violation then
    get stacked diagnostics c = constraint_name;
    return private.refusal(c);
  -- A cast that fails means the payload is not what the studio writes:
  -- bad_payload, not a bare error.
  when invalid_text_representation or numeric_value_out_of_range
       or invalid_parameter_value or invalid_datetime_format or not_null_violation then
    return jsonb_build_object('code', 'bad_payload');
  when deadlock_detected or lock_not_available then
    return jsonb_build_object('code', 'busy');
end;
$$;


--
-- Name: before_user_created(jsonb); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.before_user_created(event jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if coalesce((event -> 'user' ->> 'is_anonymous')::boolean, false) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Sign-ups are closed. Contributors sign in anonymously.'));
end $$;


--
-- Name: bump_revision(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.bump_revision() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  -- A direction's write sets the route's revision itself; leave it. A
  -- revision written by hand never goes back or stands still.
  if new.revision <= old.revision then
    new.revision := old.revision + 1;
  end if;
  if new.status is distinct from old.status then
    new.status_at := now();
  end if;
  return new;
end;
$$;


--
-- Name: can_contribute(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.can_contribute() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select (select auth.uid()) is not null and not exists (
    select 1 from public.contributor
    where id = (select auth.uid()) and blocked_at is not null
  );
$$;


--
-- Name: carry_retired_month(date); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.carry_retired_month(first_day date) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: contribution_hide_stamp(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.contribution_hide_stamp() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if new.hidden_at is null then
    new.hidden_by := null;
    new.hidden_note := null;
  elsif old.hidden_at is null then
    new.hidden_at := now();
    new.hidden_by := (select auth.uid());
  else
    new.hidden_at := old.hidden_at;
    if new.hidden_by is not null
       or exists (select 1 from auth.users where id = old.hidden_by) then
      new.hidden_by := old.hidden_by;
    end if;
  end if;
  return new;
end $$;


--
-- Name: contribution_stamp(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.contribution_stamp() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: contributor_stamp(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.contributor_stamp() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  new.first_seen_at := now();
  new.blocked_at := null;
  new.blocked_by := null;
  new.block_note := null;
  return new;
end $$;


--
-- Name: direction_bumps_route(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.direction_bumps_route() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: distance_m(double precision, double precision, double precision, double precision); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.distance_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision) RETURNS double precision
    LANGUAGE sql IMMUTABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select 111320 * sqrt(
    power(lat2 - lat1, 2) + power((lng2 - lng1) * cos(radians((lat1 + lat2) / 2)), 2)
  );
$$;


--
-- Name: draft_revision(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.draft_revision() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;


--
-- Name: draft_saver(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.draft_saver() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if new.payload is distinct from old.payload then
    new.last_saved_by := coalesce((select auth.uid()), new.last_saved_by);
  end if;
  return new;
end;
$$;


--
-- Name: hinto_cap(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.hinto_cap() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if (select count(*) from public.hinto where contribution_id = new.contribution_id) >= 2000 then
    raise exception 'hinto_cap: more than 2000 hintos' using errcode = 'P0001';
  end if;
  return new;
end $$;


--
-- Name: is_account(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.is_account() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1 from auth.users where id = (select auth.uid()) and not is_anonymous
  );
$$;


--
-- Name: is_editor(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.is_editor() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1 from private.editor where user_id = (select auth.uid())
  );
$$;


--
-- Name: last_piece_month(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.last_piece_month() RETURNS date
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  select max(to_date(substring(c.relname from '^point_batch_(\d{4}_\d{2})$'), 'YYYY_MM'))
  from pg_inherits i
  join pg_class c on c.oid = i.inhrelid
  where i.inhparent = 'public.point_batch'::regclass;
$_$;


--
-- Name: link_bumps_subjects(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.link_bumps_subjects() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if tg_op <> 'INSERT' then
    update public.stop set revision = revision + 1 where id = old.stop_id;
    update public.route r set revision = r.revision + 1
    from public.route_variant v
    where v.id = old.route_variant_id and r.id = v.route_id;
  end if;
  if tg_op <> 'DELETE' then
    update public.stop set revision = revision + 1 where id = new.stop_id;
    update public.route r set revision = r.revision + 1
    from public.route_variant v
    where v.id = new.route_variant_id and r.id = v.route_id;
  end if;
  return coalesce(new, old);
end;
$$;


--
-- Name: link_ok(jsonb, text); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.link_ok(l jsonb, ref text) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select coalesce(jsonb_typeof(l) = 'object' and private.uuid_ok(l -> ref)
    and case when jsonb_typeof(l -> 'stop_sequence') = 'number'
             then (l ->> 'stop_sequence')::numeric % 1 = 0
                  and (l ->> 'stop_sequence')::numeric between -2147483648 and 2147483647
             else false end, false);
$$;


--
-- Name: lock_rows(uuid[], uuid[]); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.lock_rows(p_routes uuid[], p_stops uuid[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  perform 1 from public.route where id = any(coalesce(p_routes, '{}')) order by id for no key update;
  perform 1 from public.stop where id = any(coalesce(p_stops, '{}')) order by id for no key update;
end;
$$;


--
-- Name: log_takedown(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.log_takedown() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: loop_fixed(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.loop_fixed() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if new.is_loop is distinct from old.is_loop then
    raise exception 'A route is made a loop or not, and stays so.'
      using errcode = '23514', constraint = 'route_loop_fixed';
  end if;
  return new;
end;
$$;


--
-- Name: loop_one_way(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.loop_one_way() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


--
-- Name: payload_of(text, uuid); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.payload_of(p_kind text, p_subject_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select case p_kind
    when 'route' then (
      select jsonb_build_object(
        'version', 1,
        'route', jsonb_build_object(
          'signboard', r.signboard, 'mode', r.mode, 'fare_note', r.fare_note, 'via', r.via,
          'head_stop_id', r.head_stop_id, 'tail_stop_id', r.tail_stop_id, 'is_loop', r.is_loop),
        'route_code', r.route_code,
        'directions', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', v.id, 'reversed', v.reversed, 'direction_name', v.direction_name,
            'origin_terminal', v.origin_terminal, 'destination_terminal', v.destination_terminal,
            'control_points', v.control_points, 'segments', v.segments, 'shape', v.shape,
            'overview', v.overview, 'confidence', v.confidence, 'borrowed_from', v.borrowed_from,
            'borrowed_part', v.borrowed_part, 'borrowed_m', v.borrowed_m,
            'signboards', to_jsonb(v.signboards),
            'links', coalesce((
              select jsonb_agg(jsonb_build_object('stop_id', l.stop_id, 'stop_sequence', l.stop_sequence)
                               order by l.stop_id)
              from public.route_stop l where l.route_variant_id = v.id), '[]'::jsonb))
            order by v.reversed, v.id)
          from public.route_variant v where v.route_id = r.id), '[]'::jsonb))
      from public.route r where r.id = p_subject_id)
    when 'hotspot' then (
      select jsonb_build_object(
        'version', 1,
        'stop', jsonb_build_object(
          'name', s.name, 'informal', s.informal, 'aliases', to_jsonb(s.aliases), 'kind', s.kind,
          'note', s.note, 'area', s.area, 'point', s.point, 'line', s.line),
        'links', coalesce((
          select jsonb_agg(jsonb_build_object('route_variant_id', l.route_variant_id,
                                              'stop_sequence', l.stop_sequence)
                           order by l.route_variant_id)
          from public.route_stop l where l.stop_id = s.id), '[]'::jsonb))
      from public.stop s where s.id = p_subject_id)
  end;
$$;


--
-- Name: payload_ok(text, jsonb); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.payload_ok(p_kind text, p jsonb) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO ''
    AS $$
declare
  e jsonb;
  l jsonb;
begin
  if jsonb_typeof(p) is distinct from 'object' or (p -> 'version') is distinct from '1'::jsonb then
    return false;
  end if;
  if p_kind = 'route' then
    if jsonb_typeof(p -> 'route') is distinct from 'object'
       or jsonb_typeof(p -> 'directions') is distinct from 'array' then
      return false;
    end if;
    for e in select * from jsonb_array_elements(p -> 'directions') loop
      if jsonb_typeof(e) is distinct from 'object' or not private.uuid_ok(e -> 'id')
         or jsonb_typeof(e -> 'links') is distinct from 'array' then
        return false;
      end if;
      for l in select * from jsonb_array_elements(e -> 'links') loop
        if not private.link_ok(l, 'stop_id') then
          return false;
        end if;
      end loop;
    end loop;
  elsif p_kind = 'hotspot' then
    if jsonb_typeof(p -> 'stop') is distinct from 'object'
       or jsonb_typeof(p -> 'links') is distinct from 'array' then
      return false;
    end if;
    for l in select * from jsonb_array_elements(p -> 'links') loop
      if not private.link_ok(l, 'route_variant_id') then
        return false;
      end if;
    end loop;
  else
    return false;
  end if;
  return true;
end;
$$;


--
-- Name: point_batch_stamp(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.point_batch_stamp() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: refusal(text); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.refusal(c text) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO ''
    AS $$
begin
  return jsonb_build_object('code', case c
    when 'route_ends_unique' then 'ends_taken'
    when 'route_loop_unique' then 'loop_taken'
    when 'stop_terminal_place_unique' then 'terminal_place_taken'
    when 'route_variant_one_per_direction' then 'direction_clash'
    when 'route_approved_ends' then 'blocked'
    when 'stop_takedown_guard' then 'blocked'
    when 'route_loop_fixed' then 'refused'
    when 'route_variant_loop_one_way' then 'refused'
    else 'refused'
  end);
end;
$$;


--
-- Name: require_editor(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.require_editor() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if not (select private.is_editor()) then
    raise exception 'An editor is required.'
      using errcode = '42501', constraint = 'editor_required';
  end if;
end;
$$;


--
-- Name: retire_month(date, integer); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.retire_month(target_month date, min_age_months integer DEFAULT 24) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
      and (contributor_id is not null or unlinked)
    for update;
  -- The contributors' lifetime numbers keep what this month's rows are about to lose.
  perform private.carry_retired_month(first_day);

  for r in
    select id, line from public.contribution
    where (received_at at time zone 'UTC') >= first_day
      and (received_at at time zone 'UTC') < next_day
      -- Retirement leaves both null, so a second run skips a done month.
      and (contributor_id is not null or unlinked)
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
      contributor_id = null, unlinked = false
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


--
-- Name: ride_totals(uuid, timestamp with time zone, timestamp with time zone, date); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.ride_totals(who uuid, received_from timestamp with time zone, received_before timestamp with time zone, days_after date) RETURNS private.contributor_retired_totals
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  with rides as (
    select c.id, c.started_at, c.vehicle, c.distance_m, c.moving_s, c.standing_s,
      c.walk_m, c.ride_m, c.walk_s, c.ride_s, c.fare_php, c.events,
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
    now(),
    coalesce(sum(r.fare_php), 0)::numeric(12, 2),
    (count(*) filter (where r.fare_php is not null))::integer,
    (count(*) filter (where r.vehicle = 'e_jeep'))::integer,
    (count(*) filter (where r.vehicle = 'uv_express'))::integer
  from rides r;
$$;


--
-- Name: route_ends_approved(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.route_ends_approved() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: stop_takedown_guard(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.stop_takedown_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: text_list(jsonb); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.text_list(v jsonb) RETURNS text[]
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select coalesce(
    (select array_agg(e) from jsonb_array_elements_text(case jsonb_typeof(v) when 'array' then v else '[]'::jsonb end) e),
    '{}'::text[]
  );
$$;


--
-- Name: trim_line_ends(jsonb, double precision); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.trim_line_ends(line jsonb, metres double precision) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  coords jsonb;
  n integer;
  first_keep integer;
  last_keep integer;
  acc double precision := 0;
begin
  coords := line -> 'coordinates';
  if coords is null or jsonb_typeof(coords) <> 'array' then
    return null;
  end if;
  n := jsonb_array_length(coords);
  for i in 2 .. n loop
    acc := acc + private.distance_m(
      (coords -> (i - 2) ->> 1)::double precision, (coords -> (i - 2) ->> 0)::double precision,
      (coords -> (i - 1) ->> 1)::double precision, (coords -> (i - 1) ->> 0)::double precision
    );
    if acc >= metres then
      first_keep := i;
      exit;
    end if;
  end loop;
  acc := 0;
  for i in reverse n - 1 .. 1 loop
    acc := acc + private.distance_m(
      (coords -> i ->> 1)::double precision, (coords -> i ->> 0)::double precision,
      (coords -> (i - 1) ->> 1)::double precision, (coords -> (i - 1) ->> 0)::double precision
    );
    if acc >= metres then
      last_keep := i;
      exit;
    end if;
  end loop;
  if first_keep is null or last_keep is null or first_keep >= last_keep then
    return null;
  end if;
  return jsonb_build_object('type', 'LineString', 'coordinates', (
    select jsonb_agg(e order by ord)
    from jsonb_array_elements(coords) with ordinality as t (e, ord)
    where ord between first_keep and last_keep
  ));
end $$;


--
-- Name: unlink_contributions(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.unlink_contributions() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  update public.contribution
    set contributor_id = null, unlinked = true, start_name = null, end_name = null, description = null
    where contributor_id = old.id;
  return old;
end;
$$;


--
-- Name: uuid_ok(jsonb); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.uuid_ok(v jsonb) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $_$
  select coalesce(jsonb_typeof(v) = 'string'
    and (v #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', false);
$_$;


--
-- Name: am_i_editor(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.am_i_editor() RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select coalesce((select private.is_editor()), false);
$$;


--
-- Name: approve_draft(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_draft(p_draft uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  d public.draft;
begin
  perform private.require_editor();
  select * into d from public.draft where id = p_draft for update;
  if not found then
    -- Approved or discarded already: a retry after a lost answer lands here.
    return jsonb_build_object('code', 'no_draft');
  end if;
  if d.status <> 'pending' then
    return jsonb_build_object('code', 'not_pending');
  end if;
  return private.apply_draft(p_draft);
exception
  when deadlock_detected or lock_not_available then
    return jsonb_build_object('code', 'busy');
end;
$$;


--
-- Name: approve_reviewed_draft(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_reviewed_draft(p_draft uuid, p_revision integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare d public.draft;
begin
  perform private.require_editor();
  select * into d from public.draft where id = p_draft for update;
  if not found then return jsonb_build_object('code', 'no_draft'); end if;
  if p_revision is null or d.revision <> p_revision then
    return jsonb_build_object('code', 'revision_mismatch', 'current_revision', d.revision);
  end if;
  -- The row lock survives through the inner RPC and its atomic apply.
  return public.approve_draft(p_draft);
exception when deadlock_detected or lock_not_available or query_canceled then
  return jsonb_build_object('code', 'busy');
end $$;


--
-- Name: begin_claim(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.begin_claim() RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  who uuid := (select auth.uid());
  made uuid;
begin
  if who is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if (select private.is_account()) then
    raise exception 'not_anonymous' using errcode = '42501';
  end if;
  -- Spent and stale tokens are cleared here; no schedule is needed.
  delete from private.claim_token
    where (anonymous_id = who and used_at is null) or made_at < now() - interval '1 day';
  insert into private.claim_token (anonymous_id) values (who) returning token into made;
  return made;
end $$;


--
-- Name: block_contributor(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.block_contributor(target uuid, note text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if not (select private.is_editor()) then
    raise exception 'not_editor' using errcode = '42501';
  end if;
  update public.contributor
    set blocked_at = now(), blocked_by = (select auth.uid()), block_note = note
    where id = target;
  if not found then
    raise exception 'no_contributor' using errcode = 'P0002';
  end if;
end $$;


--
-- Name: claim_draft(text, uuid, boolean, bigint, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_draft(p_kind text, p_subject_id uuid, p_is_new boolean, p_base_revision bigint, p_payload jsonb, p_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  d public.draft;
  made boolean := false;
begin
  perform private.require_editor();
  -- The payload v1 shape before it is stored (private.payload_ok); field
  -- values are checked on approve, where a wrong cast answers bad_payload.
  if not private.payload_ok(p_kind, p_payload) then
    return jsonb_build_object('code', 'bad_payload');
  end if;
  insert into public.draft (kind, subject_id, is_new, base_revision, payload, note, editor_id)
  values (p_kind, p_subject_id, p_is_new, p_base_revision, p_payload, p_note, (select auth.uid()))
  on conflict (kind, subject_id) do nothing
  returning * into d;
  if not found then
    select * into d from public.draft where kind = p_kind and subject_id = p_subject_id;
  else
    made := true;
  end if;
  return jsonb_build_object('code', 'ok', 'created', made, 'draft', row_to_json(d));
end;
$$;


--
-- Name: delete_my_account(boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_my_account(delete_uploads boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  who uuid := (select auth.uid());
begin
  -- First, before any lock or change: only false deletes. True, null and no argument come from
  -- app versions that promise the uploads go with the account; refusing keeps that promise
  -- from being broken silently, and their screens show the usual "couldn't delete".
  if delete_uploads is distinct from false then
    raise exception 'delete_uploads_refused: only delete_uploads => false deletes an account; nothing was changed'
      using errcode = 'P0001';
  end if;
  if who is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  -- Locked first, so a claim or an upload of theirs committing meanwhile waits for this.
  perform 1 from auth.users where id = who for update;
  -- Gone already: an earlier call deleted it and its answer was lost.
  if not found then
    return;
  end if;
  perform 1 from public.contributor where id = who for update;
  if not (select private.is_account()) then
    raise exception 'not_an_account' using errcode = '42501';
  end if;
  if (select private.is_editor()) then
    raise exception 'is_editor: an editor is removed by the owner' using errcode = '42501';
  end if;
  if exists (select 1 from public.route where owner_id = who)
     or exists (select 1 from public.route_variant where owner_id = who)
     or exists (select 1 from public.stop where owner_id = who) then
    raise exception 'owns_map_rows: this account still owns rows of the map; the owner moves them first'
      using errcode = 'P0001';
  end if;
  -- Kept: unlinked before the contributor row goes, so the cascade finds none of theirs.
  if delete_uploads is false then
    update public.contribution
      set contributor_id = null, unlinked = true, start_name = null, end_name = null, description = null
      where contributor_id = who;
  end if;
  -- GoTrue's log of their sign-ins and changes, which names them by email.
  if to_regclass('auth.audit_log_entries') is not null then
    delete from auth.audit_log_entries
      where payload ->> 'actor_id' = who::text or payload -> 'traits' ->> 'user_id' = who::text;
  end if;
  delete from auth.users where id = who;
end $$;


--
-- Name: discard_draft(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.discard_draft(p_draft uuid, p_revision integer DEFAULT NULL::integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  d public.draft;
begin
  perform private.require_editor();
  -- FOR UPDATE: a concurrent save must land before our revision read, or
  -- wait for the delete — never be read stale and still deleted.
  select * into d from public.draft where id = p_draft for update;
  if not found then
    return jsonb_build_object('code', 'no_draft');
  end if;
  if d.editor_id is not null and d.editor_id <> (select auth.uid()) then
    return jsonb_build_object('code', 'not_your_draft');
  end if;
  if p_revision is not null and d.revision <> p_revision then
    return jsonb_build_object('code', 'revision_mismatch', 'current_revision', d.revision);
  end if;
  delete from public.draft where id = p_draft;
  return jsonb_build_object('code', 'discarded');
end;
$$;


--
-- Name: finish_claim(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finish_claim(token uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: get_my_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_stats() RETURNS TABLE(rides integer, distance_m bigint, moving_s bigint, standing_s bigint, walk_m bigint, ride_m bigint, walk_s bigint, ride_s bigint, hinto_s bigint, marks integer, jeep_rides integer, e_jeep_rides integer, uv_express_rides integer, bus_rides integer, train_rides integer, ferry_rides integer, tricycle_rides integer, other_rides integer, active_days integer, first_ride_at timestamp with time zone, longest_ride_m integer, longest_ride_moving_s integer, routes_helped integer, hintuans_helped integer, fare_php_total numeric, fare_recordings integer)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
    live.e_jeep_rides + coalesce(retired.e_jeep_rides, 0),
    live.uv_express_rides + coalesce(retired.uv_express_rides, 0),
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
    live.hintuans_helped + coalesce(retired.hintuans_helped, 0),
    live.fare_php_total + coalesce(retired.fare_php_total, 0),
    live.fare_recordings + coalesce(retired.fare_recordings, 0);
end $$;


--
-- Name: get_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_profile() RETURNS TABLE(name text, phone text, profile_updated_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select c.name, c.phone, c.profile_updated_at
  from public.contributor c
  where c.id = (select auth.uid());
$$;


--
-- Name: publish_draft(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.publish_draft(p_draft uuid, p_revision integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  d public.draft;
begin
  perform private.require_editor();
  -- The draft first, then apply_draft's routes and hotspots: unpublish locks
  -- in the same order.
  select * into d from public.draft where id = p_draft for update;
  if not found then
    return jsonb_build_object('code', 'no_draft');
  end if;
  if p_revision is null or d.revision <> p_revision then
    return jsonb_build_object('code', 'revision_mismatch', 'current_revision', d.revision);
  end if;
  return private.apply_draft(p_draft);
exception
  when deadlock_detected or lock_not_available or query_canceled then
    return jsonb_build_object('code', 'busy');
end;
$$;


--
-- Name: put_back(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.put_back(p_kind text, p_subject_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  c text;
begin
  perform private.require_editor();
  if p_kind = 'route' then
    -- The route, then the ends the guard share-locks (lock order).
    perform private.lock_rows(array[p_subject_id], null);
    perform private.lock_rows(null,
      array(select unnest(array[head_stop_id, tail_stop_id]) from public.route where id = p_subject_id));
    update public.route set status = 'approved' where id = p_subject_id and status = 'taken_down';
  elsif p_kind = 'hotspot' then
    perform private.lock_rows(null, array[p_subject_id]);
    update public.stop set status = 'approved' where id = p_subject_id and status = 'taken_down';
  else
    return jsonb_build_object('code', 'bad_payload');
  end if;
  if not found then
    return jsonb_build_object('code', 'not_taken_down');
  end if;
  return jsonb_build_object('code', 'put_back');
exception
  when check_violation or unique_violation or foreign_key_violation then
    get stacked diagnostics c = constraint_name;
    return private.refusal(c);
  when deadlock_detected or lock_not_available then
    return jsonb_build_object('code', 'busy');
end;
$$;


--
-- Name: refresh_draft_base(uuid, integer, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_draft_base(p_draft uuid, p_revision integer, p_base_revision bigint) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare d public.draft; live_revision bigint; s public.stop; p jsonb; links jsonb;
begin
  perform private.require_editor();
  select * into d from public.draft where id = p_draft for update;
  if not found then return jsonb_build_object('code', 'no_draft'); end if;
  if p_revision is null or d.revision <> p_revision then
    return jsonb_build_object('code', 'revision_mismatch', 'current_revision', d.revision);
  end if;
  if d.is_new then return jsonb_build_object('code', 'subject_exists'); end if;
  if d.kind = 'route' then
    perform private.lock_rows(array[d.subject_id], null);
    select revision into live_revision from public.route where id = d.subject_id;
  else
    perform private.lock_rows(null, array[d.subject_id]);
    select * into s from public.stop where id = d.subject_id;
    live_revision := s.revision;
  end if;
  if live_revision is null then return jsonb_build_object('code', 'subject_gone'); end if;
  if p_base_revision is null or live_revision <> p_base_revision then
    return jsonb_build_object('code', 'conflict', 'current_revision', live_revision);
  end if;
  p := d.payload;
  -- The hotspot's row lock holds its links still: every link write locks the
  -- hotspot first (0022's lock order).
  if d.kind = 'hotspot' and private.payload_ok('hotspot', p)
     and nullif(p -> 'stop' -> 'area', 'null'::jsonb) is not distinct from s.area
     and (p -> 'stop' ->> 'line') is not distinct from s.line then
    if coalesce(p -> 'stop' ->> 'kind', 'hintuan') = 'terminal' then
      -- The directions the editor ticked, from the draft (an ikot is never
      -- ticked), then the ikot that pass it now.
      select coalesce(jsonb_agg(l order by l ->> 'route_variant_id'), '[]'::jsonb) into links
      from jsonb_array_elements(p -> 'links') l
      where not exists (
        select 1 from public.route_variant v join public.route r on r.id = v.route_id
        where v.id = (l ->> 'route_variant_id')::uuid and r.is_loop);
      select links || coalesce(jsonb_agg(
               jsonb_build_object('route_variant_id', k.route_variant_id, 'stop_sequence', k.stop_sequence)
               order by k.route_variant_id), '[]'::jsonb) into links
      from public.route_stop k
      join public.route_variant v on v.id = k.route_variant_id
      join public.route r on r.id = v.route_id
      where k.stop_id = d.subject_id and r.is_loop;
    else
      select coalesce(jsonb_agg(
               jsonb_build_object('route_variant_id', k.route_variant_id, 'stop_sequence', k.stop_sequence)
               order by k.route_variant_id), '[]'::jsonb) into links
      from public.route_stop k
      where k.stop_id = d.subject_id;
    end if;
    p := jsonb_set(p, '{links}', links);
  end if;
  update public.draft set base_revision = live_revision, status = 'draft', submitted_at = null, payload = p
    where id = p_draft returning * into d;
  return jsonb_build_object('code', 'ok', 'draft', row_to_json(d));
exception when deadlock_detected or lock_not_available or query_canceled then
  return jsonb_build_object('code', 'busy');
end $$;


--
-- Name: save_contribution(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_contribution(recording jsonb) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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
    walk_m, ride_m, walk_s, ride_s, fare_php,
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
    (recording ->> 'fare_php')::numeric,
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


--
-- Name: save_draft(uuid, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_draft(p_draft uuid, p_revision integer, p_payload jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  d public.draft;
begin
  perform private.require_editor();
  select * into d from public.draft where id = p_draft for update;
  if not found then
    return jsonb_build_object('code', 'no_draft');
  end if;
  -- The maker's own, or a maker-less draft (its maker's account is gone).
  if d.editor_id is not null and d.editor_id <> (select auth.uid()) then
    return jsonb_build_object('code', 'not_your_draft');
  end if;
  if p_revision is null or d.revision <> p_revision then
    return jsonb_build_object('code', 'revision_mismatch', 'current_revision', d.revision);
  end if;
  if not private.payload_ok(d.kind, p_payload) then
    return jsonb_build_object('code', 'bad_payload');
  end if;
  -- Out of review, as the direct update does; draft_revision moves revision and
  -- updated_at, draft_saver last_saved_by.
  update public.draft
  set payload = p_payload, status = 'draft', submitted_at = null
  where id = p_draft
  returning * into d;
  return jsonb_build_object('code', 'ok', 'created', false, 'draft', row_to_json(d));
exception
  -- The payload's size check (0018).
  when check_violation then
    return jsonb_build_object('code', 'bad_payload');
end;
$$;


--
-- Name: send_back_draft(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_back_draft(p_draft uuid, p_revision integer, p_note text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  d public.draft;
begin
  perform private.require_editor();
  update public.draft
  set status = 'draft', submitted_at = null, note = p_note
  where id = p_draft and revision = p_revision and status = 'pending'
  returning * into d;
  if found then
    return jsonb_build_object('code', 'sent_back', 'draft', row_to_json(d));
  end if;
  select * into d from public.draft where id = p_draft;
  if not found then
    return jsonb_build_object('code', 'no_draft');
  end if;
  if d.revision <> p_revision then
    return jsonb_build_object('code', 'revision_mismatch', 'current_revision', d.revision);
  end if;
  return jsonb_build_object('code', 'not_pending');
end;
$$;


--
-- Name: set_profile(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_profile(name text, phone text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
declare
  who uuid := (select auth.uid());
  clean text := btrim(set_profile.name);
begin
  if who is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if not (select private.is_account()) then
    raise exception 'not_an_account' using errcode = '42501';
  end if;
  if clean is null or char_length(clean) not between 1 and 80 then
    raise exception 'bad_name: 1 to 80 characters' using errcode = '22023';
  end if;
  if set_profile.phone is null or set_profile.phone !~ '^\+639[0-9]{9}$' then
    raise exception 'bad_phone: +639 and nine digits' using errcode = '22023';
  end if;
  -- Two statements: the stamp trigger on insert clears the block columns only.
  insert into public.contributor (id) values (who) on conflict (id) do nothing;
  update public.contributor
    set name = clean, phone = set_profile.phone, profile_updated_at = now()
    where id = who;
end $_$;


--
-- Name: submit_draft(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_draft(p_draft uuid, p_revision integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  d public.draft;
begin
  perform private.require_editor();
  update public.draft
  set status = 'pending', submitted_at = now()
  where id = p_draft and revision = p_revision and status = 'draft'
  returning * into d;
  if found then
    return jsonb_build_object('code', 'submitted', 'draft', row_to_json(d));
  end if;
  select * into d from public.draft where id = p_draft;
  if not found then
    return jsonb_build_object('code', 'no_draft');
  end if;
  if d.revision <> p_revision then
    return jsonb_build_object('code', 'revision_mismatch', 'current_revision', d.revision);
  end if;
  return jsonb_build_object('code', 'already_pending');
end;
$$;


--
-- Name: take_down(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.take_down(p_kind text, p_subject_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  c text;
begin
  perform private.require_editor();
  if p_kind = 'route' then
    perform private.lock_rows(array[p_subject_id], null);
    update public.route set status = 'taken_down' where id = p_subject_id and status = 'approved';
  elsif p_kind = 'hotspot' then
    -- The routes the end guard reads, then the hotspot (lock order).
    perform private.lock_rows(
      array(select id from public.route where p_subject_id in (head_stop_id, tail_stop_id)),
      array[p_subject_id]);
    update public.stop set status = 'taken_down' where id = p_subject_id and status = 'approved';
  else
    return jsonb_build_object('code', 'bad_payload');
  end if;
  if not found then
    return jsonb_build_object('code', 'not_approved');
  end if;
  return jsonb_build_object('code', 'taken_down');
exception
  when check_violation or unique_violation or foreign_key_violation then
    get stacked diagnostics c = constraint_name;
    return private.refusal(c);
  when deadlock_detected or lock_not_available then
    return jsonb_build_object('code', 'busy');
end;
$$;


--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: unblock_contributor(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unblock_contributor(target uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if not (select private.is_editor()) then
    raise exception 'not_editor' using errcode = '42501';
  end if;
  update public.contributor
    set blocked_at = null, blocked_by = null, block_note = null
    where id = target;
  if not found then
    raise exception 'no_contributor' using errcode = 'P0002';
  end if;
end $$;


--
-- Name: unpublish(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unpublish(p_kind text, p_subject_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  d public.draft;
  had_draft boolean;
  before_revision bigint;
  after_revision bigint;
  saved_at timestamptz;
  saved_by uuid;
  c text;
begin
  perform private.require_editor();
  if p_kind is distinct from 'route' and p_kind is distinct from 'hotspot' then
    return jsonb_build_object('code', 'bad_payload');
  end if;
  -- The lock order: the draft, then routes by id, then hotspots by id, as
  -- publish_draft takes them.
  select * into d from public.draft where kind = p_kind and subject_id = p_subject_id for update;
  had_draft := found;
  if p_kind = 'route' then
    perform private.lock_rows(array[p_subject_id], null);
    select revision into before_revision from public.route where id = p_subject_id;
    update public.route set status = 'taken_down' where id = p_subject_id and status = 'approved'
    returning revision, last_saved_at, last_saved_by into after_revision, saved_at, saved_by;
  else
    -- The routes the end guard reads, then the hotspot.
    perform private.lock_rows(
      array(select id from public.route where p_subject_id in (head_stop_id, tail_stop_id)),
      array[p_subject_id]);
    select revision into before_revision from public.stop where id = p_subject_id;
    update public.stop set status = 'taken_down' where id = p_subject_id and status = 'approved'
    returning revision, last_saved_at, last_saved_by into after_revision, saved_at, saved_by;
  end if;
  if not found then
    return jsonb_build_object('code', 'not_published');
  end if;

  if not had_draft then
    -- Held by the editor who unpublished it, carrying the row's own last save.
    insert into public.draft (kind, subject_id, is_new, base_revision, payload, editor_id, last_saved_by, updated_at)
    values (p_kind, p_subject_id, false, after_revision, private.payload_of(p_kind, p_subject_id),
            (select auth.uid()), saved_by, coalesce(saved_at, now()))
    on conflict (kind, subject_id) do nothing
    returning * into d;
    if not found then
      -- A draft claimed meanwhile, between the read above and this insert.
      select * into d from public.draft where kind = p_kind and subject_id = p_subject_id for update;
      had_draft := true;
    end if;
  end if;
  if had_draft and d.base_revision = before_revision then
    update public.draft set base_revision = after_revision where id = d.id returning * into d;
  end if;
  return jsonb_build_object('code', 'unpublished', 'draft', row_to_json(d));
exception
  when check_violation or unique_violation or foreign_key_violation then
    get stacked diagnostics c = constraint_name;
    return private.refusal(c);
  when deadlock_detected or lock_not_available then
    return jsonb_build_object('code', 'busy');
end;
$$;


--
-- Name: claim_token; Type: TABLE; Schema: private; Owner: -
--

CREATE TABLE private.claim_token (
    token uuid DEFAULT gen_random_uuid() NOT NULL,
    anonymous_id uuid NOT NULL,
    made_at timestamp with time zone DEFAULT now() NOT NULL,
    used_at timestamp with time zone,
    claimed_by uuid
);


--
-- Name: editor; Type: TABLE; Schema: private; Owner: -
--

CREATE TABLE private.editor (
    user_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contribution; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contribution (
    id uuid NOT NULL,
    contributor_id uuid,
    format_version smallint NOT NULL,
    rules_version smallint NOT NULL,
    consent_version smallint NOT NULL,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone NOT NULL,
    sent_at timestamp with time zone NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    vehicle text,
    start_name text,
    end_name text,
    description text,
    distance_m integer NOT NULL,
    moving_s integer NOT NULL,
    standing_s integer NOT NULL,
    lost_s integer NOT NULL,
    point_count integer NOT NULL,
    events jsonb NOT NULL,
    gaps jsonb NOT NULL,
    line jsonb,
    west double precision,
    south double precision,
    east double precision,
    north double precision,
    hidden_at timestamp with time zone,
    hidden_by uuid,
    hidden_note text,
    walk_m integer,
    ride_m integer,
    walk_s integer,
    ride_s integer,
    fare_php numeric(7,2),
    unlinked boolean DEFAULT false NOT NULL,
    CONSTRAINT contribution_check CHECK (((ended_at > started_at) AND (ended_at <= (started_at + '06:00:00'::interval)))),
    CONSTRAINT contribution_check1 CHECK (((west <= east) AND (south <= north))),
    CONSTRAINT contribution_description_check CHECK ((char_length(description) <= 1000)),
    CONSTRAINT contribution_distance_m_check CHECK ((distance_m >= 0)),
    CONSTRAINT contribution_east_check CHECK (((east >= (116)::double precision) AND (east <= (127)::double precision))),
    CONSTRAINT contribution_end_name_check CHECK ((char_length(end_name) <= 80)),
    CONSTRAINT contribution_events_check CHECK (((jsonb_typeof(events) = 'array'::text) AND (jsonb_array_length(events) <= 500))),
    CONSTRAINT contribution_fare_php_check CHECK (((fare_php >= (0)::numeric) AND (fare_php <= (2000)::numeric))),
    CONSTRAINT contribution_gaps_check CHECK (((jsonb_typeof(gaps) = 'array'::text) AND (jsonb_array_length(gaps) <= 500))),
    CONSTRAINT contribution_hidden_note_check CHECK ((char_length(hidden_note) <= 500)),
    CONSTRAINT contribution_line_check CHECK (((line IS NULL) OR (((line ->> 'type'::text) = 'LineString'::text) AND (octet_length((line)::text) <= 200000)))),
    CONSTRAINT contribution_lost_s_check CHECK ((lost_s >= 0)),
    CONSTRAINT contribution_moving_s_check CHECK ((moving_s >= 0)),
    CONSTRAINT contribution_north_check CHECK (((north >= (4)::double precision) AND (north <= (22)::double precision))),
    CONSTRAINT contribution_point_count_check CHECK (((point_count >= 0) AND (point_count <= 14400))),
    CONSTRAINT contribution_ride_m_check CHECK ((ride_m >= 0)),
    CONSTRAINT contribution_ride_s_check CHECK ((ride_s >= 0)),
    CONSTRAINT contribution_south_check CHECK (((south >= (4)::double precision) AND (south <= (22)::double precision))),
    CONSTRAINT contribution_split_distance CHECK ((abs(((walk_m + ride_m) - distance_m)) <= 2)),
    CONSTRAINT contribution_split_time CHECK ((abs((((walk_s + ride_s) - moving_s) - standing_s)) <= 2)),
    CONSTRAINT contribution_split_whole CHECK ((((walk_m IS NULL) = (ride_m IS NULL)) AND ((walk_m IS NULL) = (walk_s IS NULL)) AND ((walk_m IS NULL) = (ride_s IS NULL)))),
    CONSTRAINT contribution_standing_s_check CHECK ((standing_s >= 0)),
    CONSTRAINT contribution_start_name_check CHECK ((char_length(start_name) <= 80)),
    CONSTRAINT contribution_unlinked_unowned CHECK (((NOT unlinked) OR (contributor_id IS NULL))),
    CONSTRAINT contribution_vehicle_check CHECK ((vehicle = ANY (ARRAY['jeep'::text, 'e_jeep'::text, 'uv_express'::text, 'bus'::text, 'train'::text, 'ferry'::text, 'tricycle'::text, 'other'::text]))),
    CONSTRAINT contribution_walk_m_check CHECK ((walk_m >= 0)),
    CONSTRAINT contribution_walk_s_check CHECK ((walk_s >= 0)),
    CONSTRAINT contribution_west_check CHECK (((west >= (116)::double precision) AND (west <= (127)::double precision)))
);


--
-- Name: contribution_use; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contribution_use (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contribution_id uuid NOT NULL,
    kind text NOT NULL,
    subject_id uuid NOT NULL,
    editor_id uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contribution_use_kind_check CHECK ((kind = ANY (ARRAY['direction'::text, 'hintuan'::text])))
);


--
-- Name: contributor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contributor (
    id uuid NOT NULL,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    blocked_at timestamp with time zone,
    blocked_by uuid,
    block_note text,
    name text,
    phone text,
    profile_updated_at timestamp with time zone,
    CONSTRAINT contributor_block_note_check CHECK ((char_length(block_note) <= 500)),
    CONSTRAINT contributor_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 80))),
    CONSTRAINT contributor_phone_check CHECK ((phone ~ '^\+639[0-9]{9}$'::text))
);


--
-- Name: draft; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.draft (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind text NOT NULL,
    subject_id uuid NOT NULL,
    is_new boolean NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    payload jsonb NOT NULL,
    base_revision bigint,
    revision integer DEFAULT 1 NOT NULL,
    editor_id uuid DEFAULT auth.uid(),
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone,
    last_saved_by uuid DEFAULT auth.uid(),
    CONSTRAINT draft_check CHECK ((is_new OR (base_revision IS NOT NULL))),
    CONSTRAINT draft_kind_check CHECK ((kind = ANY (ARRAY['route'::text, 'hotspot'::text]))),
    CONSTRAINT draft_note_check CHECK ((char_length(note) <= 2000)),
    CONSTRAINT draft_payload_check CHECK (((jsonb_typeof(payload) = 'object'::text) AND COALESCE((jsonb_typeof((payload -> 'version'::text)) = 'number'::text), false) AND (pg_column_size(payload) <= 2000000))),
    CONSTRAINT draft_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text])))
);


--
-- Name: editor_name; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.editor_name (
    user_id uuid NOT NULL,
    name text NOT NULL,
    CONSTRAINT editor_name_name_check CHECK (((char_length(btrim(name)) >= 1) AND (char_length(btrim(name)) <= 60)))
);


--
-- Name: hinto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hinto (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    started_at timestamp with time zone NOT NULL,
    seconds integer NOT NULL,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    cell bigint GENERATED ALWAYS AS ((((floor((lat * (5000)::double precision)))::bigint * 1000000) + (floor((lng * (5000)::double precision)))::bigint)) STORED,
    rules_version smallint NOT NULL,
    CONSTRAINT hinto_lat_check CHECK (((lat >= (4)::double precision) AND (lat <= (22)::double precision))),
    CONSTRAINT hinto_lng_check CHECK (((lng >= (116)::double precision) AND (lng <= (127)::double precision))),
    CONSTRAINT hinto_seconds_check CHECK (((seconds >= 1) AND (seconds <= 21600))),
    CONSTRAINT hinto_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
)
PARTITION BY RANGE (month);


--
-- Name: point_batch_2026_10; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2026_10 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2026_11; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2026_11 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2026_12; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2026_12 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2027_01; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2027_01 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2027_02; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2027_02 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2027_03; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2027_03 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2027_04; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2027_04 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2027_05; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2027_05 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2027_06; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2027_06 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2027_07; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2027_07 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2027_08; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2027_08 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2027_09; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2027_09 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2027_10; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2027_10 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2027_11; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2027_11 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2027_12; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2027_12 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2028_01; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2028_01 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2028_02; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2028_02 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2028_03; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2028_03 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2028_04; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2028_04 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2028_05; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2028_05 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2028_06; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2028_06 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2028_07; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2028_07 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2028_08; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2028_08 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2028_09; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2028_09 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2028_10; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2028_10 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2028_11; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2028_11 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_2028_12; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_2028_12 (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: point_batch_default; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_batch_default (
    contribution_id uuid NOT NULL,
    seq smallint NOT NULL,
    month date NOT NULL,
    first_at timestamp with time zone NOT NULL,
    first_lat integer NOT NULL,
    first_lng integer NOT NULL,
    point_count smallint NOT NULL,
    dt_ms integer[] NOT NULL,
    dlat integer[] NOT NULL,
    dlng integer[] NOT NULL,
    accuracy_m smallint[] NOT NULL,
    speed_cms smallint[],
    CONSTRAINT point_batch_check CHECK (((cardinality(dt_ms) = point_count) AND (cardinality(dlat) = point_count) AND (cardinality(dlng) = point_count) AND (cardinality(accuracy_m) = point_count) AND ((speed_cms IS NULL) OR (cardinality(speed_cms) = point_count)))),
    CONSTRAINT point_batch_first_lat_check CHECK (((first_lat >= 4000000) AND (first_lat <= 22000000))),
    CONSTRAINT point_batch_first_lng_check CHECK (((first_lng >= 116000000) AND (first_lng <= 127000000))),
    CONSTRAINT point_batch_point_count_check CHECK (((point_count >= 1) AND (point_count <= 600))),
    CONSTRAINT point_batch_seq_check CHECK ((seq >= 0))
);


--
-- Name: route; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.route (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    signboard text,
    route_code text,
    long_name text,
    mode public.transport_mode DEFAULT 'jeepney'::public.transport_mode NOT NULL,
    fare_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    head_stop_id uuid,
    tail_stop_id uuid,
    via text,
    is_loop boolean DEFAULT false NOT NULL,
    status text DEFAULT 'approved'::text NOT NULL,
    status_at timestamp with time zone DEFAULT now() NOT NULL,
    revision bigint DEFAULT 1 NOT NULL,
    published_at timestamp with time zone,
    published_by uuid,
    last_saved_at timestamp with time zone,
    last_saved_by uuid,
    CONSTRAINT route_loop_ends CHECK (((is_loop AND (head_stop_id IS NULL) AND (tail_stop_id IS NULL)) OR ((NOT is_loop) AND (head_stop_id IS NOT NULL) AND (tail_stop_id IS NOT NULL)))),
    CONSTRAINT route_loop_signboard CHECK (((NOT is_loop) OR (COALESCE(btrim(signboard), ''::text) <> ''::text))),
    CONSTRAINT route_status_check CHECK ((status = ANY (ARRAY['approved'::text, 'taken_down'::text])))
);


--
-- Name: COLUMN route.is_loop; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.route.is_loop IS 'A loop: goes round one way with no head or tail, one direction, called by its signboard. Set when the route is made; never changes.';


--
-- Name: COLUMN route.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.route.status IS 'approved: published at the next publish. taken_down: left out of it.';


--
-- Name: COLUMN route.revision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.route.revision IS 'Bumped by every change to the route or one of its directions. A draft records it as base_revision.';


--
-- Name: COLUMN route.published_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.route.published_at IS 'When the route was last published. Approximate (status_at) for rows published before 20261105160000.';


--
-- Name: COLUMN route.published_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.route.published_by IS 'The maker of the draft last published. Approximate (owner_id) before 20261105160000.';


--
-- Name: COLUMN route.last_saved_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.route.last_saved_at IS 'When the draft last published was last saved. Approximate (status_at) before 20261105160000.';


--
-- Name: COLUMN route.last_saved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.route.last_saved_by IS 'Who last saved the draft last published. Approximate (owner_id) before 20261105160000.';


--
-- Name: route_stop; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.route_stop (
    route_variant_id uuid NOT NULL,
    stop_id uuid NOT NULL,
    stop_sequence integer NOT NULL
);


--
-- Name: route_variant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.route_variant (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    route_id uuid NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    direction_name text,
    origin_terminal text,
    destination_terminal text,
    control_points jsonb DEFAULT '[]'::jsonb NOT NULL,
    segments jsonb DEFAULT '[]'::jsonb NOT NULL,
    shape jsonb,
    confidence public.route_confidence DEFAULT 'drawn'::public.route_confidence NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reversed boolean DEFAULT false NOT NULL,
    borrowed_from uuid,
    borrowed_part text,
    borrowed_m double precision,
    overview jsonb,
    signboards text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT route_variant_borrow_not_self CHECK ((borrowed_from IS DISTINCT FROM id)),
    CONSTRAINT route_variant_borrow_whole CHECK ((((borrowed_part IS NULL) = (borrowed_m IS NULL)) AND ((borrowed_from IS NULL) OR (borrowed_part IS NOT NULL)))),
    CONSTRAINT route_variant_borrowed_m_check CHECK ((borrowed_m >= (0)::double precision)),
    CONSTRAINT route_variant_borrowed_part_check CHECK ((borrowed_part = ANY (ARRAY['start'::text, 'end'::text])))
);


--
-- Name: COLUMN route_variant.overview; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.route_variant.overview IS 'The line thinned at 5 m, 5 decimals: what the editor''s list draws. Null until saved or backfilled; shape is the line of record.';


--
-- Name: COLUMN route_variant.signboards; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.route_variant.signboards IS 'Object names in the signboards bucket, in order: the boards this direction shows.';


--
-- Name: stop; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stop (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    name text NOT NULL,
    point jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    kind public.stop_kind DEFAULT 'hintuan'::public.stop_kind NOT NULL,
    area jsonb,
    note text,
    informal text,
    aliases text[] DEFAULT '{}'::text[] NOT NULL,
    line text,
    status text DEFAULT 'approved'::text NOT NULL,
    status_at timestamp with time zone DEFAULT now() NOT NULL,
    revision bigint DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone,
    published_by uuid,
    last_saved_at timestamp with time zone,
    last_saved_by uuid,
    CONSTRAINT stop_line_hintuan CHECK (((line IS NULL) OR (kind = 'hintuan'::public.stop_kind))),
    CONSTRAINT stop_line_named CHECK (((line IS NULL) OR (line = ANY (ARRAY['LRT-1'::text, 'LRT-2'::text, 'MRT-3'::text, 'PRFS'::text])))),
    CONSTRAINT stop_status_check CHECK ((status = ANY (ARRAY['approved'::text, 'taken_down'::text])))
);


--
-- Name: COLUMN stop.line; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stop.line IS 'The line this hintuan is a station of: a train''s (LRT-1, LRT-2, MRT-3) or the ferry''s (PRFS); null for every other hotspot.';


--
-- Name: COLUMN stop.revision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stop.revision IS 'Bumped by every change to the hotspot. A draft records it as base_revision.';


--
-- Name: COLUMN stop.published_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stop.published_at IS 'When the hotspot was last published. Approximate (status_at) for rows published before 20261105160000.';


--
-- Name: COLUMN stop.published_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stop.published_by IS 'The maker of the draft last published. Approximate (owner_id) before 20261105160000.';


--
-- Name: COLUMN stop.last_saved_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stop.last_saved_at IS 'When the draft last published was last saved. Approximate (status_at) before 20261105160000.';


--
-- Name: COLUMN stop.last_saved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stop.last_saved_by IS 'Who last saved the draft last published. Approximate (owner_id) before 20261105160000.';


--
-- Name: takedown; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.takedown (
    id bigint NOT NULL,
    kind text NOT NULL,
    subject_id uuid NOT NULL,
    taken_down_at timestamp with time zone DEFAULT now() NOT NULL,
    put_back_at timestamp with time zone,
    editor_id uuid DEFAULT auth.uid(),
    put_back_by uuid,
    CONSTRAINT takedown_kind_check CHECK ((kind = ANY (ARRAY['route'::text, 'hotspot'::text])))
);


--
-- Name: takedown_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.takedown ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.takedown_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: point_batch_2026_10; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2026_10 FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');


--
-- Name: point_batch_2026_11; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2026_11 FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');


--
-- Name: point_batch_2026_12; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2026_12 FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');


--
-- Name: point_batch_2027_01; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2027_01 FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');


--
-- Name: point_batch_2027_02; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2027_02 FOR VALUES FROM ('2027-02-01') TO ('2027-03-01');


--
-- Name: point_batch_2027_03; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2027_03 FOR VALUES FROM ('2027-03-01') TO ('2027-04-01');


--
-- Name: point_batch_2027_04; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2027_04 FOR VALUES FROM ('2027-04-01') TO ('2027-05-01');


--
-- Name: point_batch_2027_05; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2027_05 FOR VALUES FROM ('2027-05-01') TO ('2027-06-01');


--
-- Name: point_batch_2027_06; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2027_06 FOR VALUES FROM ('2027-06-01') TO ('2027-07-01');


--
-- Name: point_batch_2027_07; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2027_07 FOR VALUES FROM ('2027-07-01') TO ('2027-08-01');


--
-- Name: point_batch_2027_08; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2027_08 FOR VALUES FROM ('2027-08-01') TO ('2027-09-01');


--
-- Name: point_batch_2027_09; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2027_09 FOR VALUES FROM ('2027-09-01') TO ('2027-10-01');


--
-- Name: point_batch_2027_10; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2027_10 FOR VALUES FROM ('2027-10-01') TO ('2027-11-01');


--
-- Name: point_batch_2027_11; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2027_11 FOR VALUES FROM ('2027-11-01') TO ('2027-12-01');


--
-- Name: point_batch_2027_12; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2027_12 FOR VALUES FROM ('2027-12-01') TO ('2028-01-01');


--
-- Name: point_batch_2028_01; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2028_01 FOR VALUES FROM ('2028-01-01') TO ('2028-02-01');


--
-- Name: point_batch_2028_02; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2028_02 FOR VALUES FROM ('2028-02-01') TO ('2028-03-01');


--
-- Name: point_batch_2028_03; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2028_03 FOR VALUES FROM ('2028-03-01') TO ('2028-04-01');


--
-- Name: point_batch_2028_04; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2028_04 FOR VALUES FROM ('2028-04-01') TO ('2028-05-01');


--
-- Name: point_batch_2028_05; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2028_05 FOR VALUES FROM ('2028-05-01') TO ('2028-06-01');


--
-- Name: point_batch_2028_06; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2028_06 FOR VALUES FROM ('2028-06-01') TO ('2028-07-01');


--
-- Name: point_batch_2028_07; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2028_07 FOR VALUES FROM ('2028-07-01') TO ('2028-08-01');


--
-- Name: point_batch_2028_08; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2028_08 FOR VALUES FROM ('2028-08-01') TO ('2028-09-01');


--
-- Name: point_batch_2028_09; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2028_09 FOR VALUES FROM ('2028-09-01') TO ('2028-10-01');


--
-- Name: point_batch_2028_10; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2028_10 FOR VALUES FROM ('2028-10-01') TO ('2028-11-01');


--
-- Name: point_batch_2028_11; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2028_11 FOR VALUES FROM ('2028-11-01') TO ('2028-12-01');


--
-- Name: point_batch_2028_12; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_2028_12 FOR VALUES FROM ('2028-12-01') TO ('2029-01-01');


--
-- Name: point_batch_default; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch ATTACH PARTITION public.point_batch_default DEFAULT;


--
-- Name: claim_token claim_token_pkey; Type: CONSTRAINT; Schema: private; Owner: -
--

ALTER TABLE ONLY private.claim_token
    ADD CONSTRAINT claim_token_pkey PRIMARY KEY (token);


--
-- Name: contributor_retired_totals contributor_retired_totals_pkey; Type: CONSTRAINT; Schema: private; Owner: -
--

ALTER TABLE ONLY private.contributor_retired_totals
    ADD CONSTRAINT contributor_retired_totals_pkey PRIMARY KEY (contributor_id);


--
-- Name: editor editor_pkey; Type: CONSTRAINT; Schema: private; Owner: -
--

ALTER TABLE ONLY private.editor
    ADD CONSTRAINT editor_pkey PRIMARY KEY (user_id);


--
-- Name: contribution contribution_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution
    ADD CONSTRAINT contribution_pkey PRIMARY KEY (id);


--
-- Name: contribution_use contribution_use_contribution_id_kind_subject_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_use
    ADD CONSTRAINT contribution_use_contribution_id_kind_subject_id_key UNIQUE (contribution_id, kind, subject_id);


--
-- Name: contribution_use contribution_use_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_use
    ADD CONSTRAINT contribution_use_pkey PRIMARY KEY (id);


--
-- Name: contributor contributor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contributor
    ADD CONSTRAINT contributor_pkey PRIMARY KEY (id);


--
-- Name: draft draft_one_per_subject; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft
    ADD CONSTRAINT draft_one_per_subject UNIQUE (kind, subject_id);


--
-- Name: draft draft_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft
    ADD CONSTRAINT draft_pkey PRIMARY KEY (id);


--
-- Name: editor_name editor_name_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.editor_name
    ADD CONSTRAINT editor_name_pkey PRIMARY KEY (user_id);


--
-- Name: hinto hinto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hinto
    ADD CONSTRAINT hinto_pkey PRIMARY KEY (contribution_id, seq);


--
-- Name: point_batch point_batch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch
    ADD CONSTRAINT point_batch_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2026_10 point_batch_2026_10_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2026_10
    ADD CONSTRAINT point_batch_2026_10_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2026_11 point_batch_2026_11_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2026_11
    ADD CONSTRAINT point_batch_2026_11_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2026_12 point_batch_2026_12_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2026_12
    ADD CONSTRAINT point_batch_2026_12_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2027_01 point_batch_2027_01_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2027_01
    ADD CONSTRAINT point_batch_2027_01_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2027_02 point_batch_2027_02_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2027_02
    ADD CONSTRAINT point_batch_2027_02_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2027_03 point_batch_2027_03_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2027_03
    ADD CONSTRAINT point_batch_2027_03_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2027_04 point_batch_2027_04_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2027_04
    ADD CONSTRAINT point_batch_2027_04_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2027_05 point_batch_2027_05_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2027_05
    ADD CONSTRAINT point_batch_2027_05_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2027_06 point_batch_2027_06_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2027_06
    ADD CONSTRAINT point_batch_2027_06_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2027_07 point_batch_2027_07_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2027_07
    ADD CONSTRAINT point_batch_2027_07_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2027_08 point_batch_2027_08_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2027_08
    ADD CONSTRAINT point_batch_2027_08_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2027_09 point_batch_2027_09_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2027_09
    ADD CONSTRAINT point_batch_2027_09_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2027_10 point_batch_2027_10_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2027_10
    ADD CONSTRAINT point_batch_2027_10_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2027_11 point_batch_2027_11_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2027_11
    ADD CONSTRAINT point_batch_2027_11_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2027_12 point_batch_2027_12_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2027_12
    ADD CONSTRAINT point_batch_2027_12_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2028_01 point_batch_2028_01_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2028_01
    ADD CONSTRAINT point_batch_2028_01_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2028_02 point_batch_2028_02_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2028_02
    ADD CONSTRAINT point_batch_2028_02_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2028_03 point_batch_2028_03_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2028_03
    ADD CONSTRAINT point_batch_2028_03_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2028_04 point_batch_2028_04_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2028_04
    ADD CONSTRAINT point_batch_2028_04_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2028_05 point_batch_2028_05_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2028_05
    ADD CONSTRAINT point_batch_2028_05_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2028_06 point_batch_2028_06_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2028_06
    ADD CONSTRAINT point_batch_2028_06_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2028_07 point_batch_2028_07_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2028_07
    ADD CONSTRAINT point_batch_2028_07_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2028_08 point_batch_2028_08_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2028_08
    ADD CONSTRAINT point_batch_2028_08_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2028_09 point_batch_2028_09_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2028_09
    ADD CONSTRAINT point_batch_2028_09_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2028_10 point_batch_2028_10_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2028_10
    ADD CONSTRAINT point_batch_2028_10_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2028_11 point_batch_2028_11_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2028_11
    ADD CONSTRAINT point_batch_2028_11_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_2028_12 point_batch_2028_12_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_2028_12
    ADD CONSTRAINT point_batch_2028_12_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: point_batch_default point_batch_default_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_batch_default
    ADD CONSTRAINT point_batch_default_pkey PRIMARY KEY (contribution_id, seq, month);


--
-- Name: route route_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route
    ADD CONSTRAINT route_pkey PRIMARY KEY (id);


--
-- Name: route_stop route_stop_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_stop
    ADD CONSTRAINT route_stop_pkey PRIMARY KEY (route_variant_id, stop_id);


--
-- Name: route_variant route_variant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_variant
    ADD CONSTRAINT route_variant_pkey PRIMARY KEY (id);


--
-- Name: stop stop_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop
    ADD CONSTRAINT stop_pkey PRIMARY KEY (id);


--
-- Name: takedown takedown_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.takedown
    ADD CONSTRAINT takedown_pkey PRIMARY KEY (id);


--
-- Name: claim_token_anonymous; Type: INDEX; Schema: private; Owner: -
--

CREATE INDEX claim_token_anonymous ON private.claim_token USING btree (anonymous_id);


--
-- Name: claim_token_claimed_by; Type: INDEX; Schema: private; Owner: -
--

CREATE INDEX claim_token_claimed_by ON private.claim_token USING btree (claimed_by) WHERE (claimed_by IS NOT NULL);


--
-- Name: contribution_contributor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contribution_contributor ON public.contribution USING btree (contributor_id, received_at);


--
-- Name: contribution_hidden_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contribution_hidden_by ON public.contribution USING btree (hidden_by) WHERE (hidden_by IS NOT NULL);


--
-- Name: contribution_received; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contribution_received ON public.contribution USING btree (received_at);


--
-- Name: contribution_use_editor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contribution_use_editor ON public.contribution_use USING btree (editor_id);


--
-- Name: contribution_use_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contribution_use_subject ON public.contribution_use USING btree (subject_id);


--
-- Name: contributor_blocked_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contributor_blocked_by ON public.contributor USING btree (blocked_by) WHERE (blocked_by IS NOT NULL);


--
-- Name: draft_editor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX draft_editor_id_idx ON public.draft USING btree (editor_id);


--
-- Name: draft_last_saved_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX draft_last_saved_by_idx ON public.draft USING btree (last_saved_by) WHERE (last_saved_by IS NOT NULL);


--
-- Name: hinto_cell; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hinto_cell ON public.hinto USING btree (cell);


--
-- Name: route_ends_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX route_ends_unique ON public.route USING btree (head_stop_id, tail_stop_id, COALESCE(via, ''::text)) WHERE (status = 'approved'::text);


--
-- Name: route_last_saved_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX route_last_saved_by_idx ON public.route USING btree (last_saved_by) WHERE (last_saved_by IS NOT NULL);


--
-- Name: route_loop_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX route_loop_unique ON public.route USING btree (lower(btrim(signboard)), COALESCE(via, ''::text)) WHERE (is_loop AND (status = 'approved'::text));


--
-- Name: route_owner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX route_owner_id_idx ON public.route USING btree (owner_id);


--
-- Name: route_published_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX route_published_by_idx ON public.route USING btree (published_by) WHERE (published_by IS NOT NULL);


--
-- Name: route_stop_sequence_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX route_stop_sequence_idx ON public.route_stop USING btree (route_variant_id, stop_sequence);


--
-- Name: route_stop_stop_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX route_stop_stop_id_idx ON public.route_stop USING btree (stop_id);


--
-- Name: route_variant_borrowed_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX route_variant_borrowed_from ON public.route_variant USING btree (borrowed_from) WHERE (borrowed_from IS NOT NULL);


--
-- Name: route_variant_one_per_direction; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX route_variant_one_per_direction ON public.route_variant USING btree (route_id, reversed);


--
-- Name: route_variant_owner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX route_variant_owner_id_idx ON public.route_variant USING btree (owner_id);


--
-- Name: stop_last_saved_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stop_last_saved_by_idx ON public.stop USING btree (last_saved_by) WHERE (last_saved_by IS NOT NULL);


--
-- Name: stop_owner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stop_owner_id_idx ON public.stop USING btree (owner_id);


--
-- Name: stop_published_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stop_published_by_idx ON public.stop USING btree (published_by) WHERE (published_by IS NOT NULL);


--
-- Name: stop_terminal_place_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX stop_terminal_place_unique ON public.stop USING btree (lower(COALESCE(NULLIF(btrim(informal), ''::text), name))) WHERE ((kind = 'terminal'::public.stop_kind) AND (status = 'approved'::text));


--
-- Name: takedown_editor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX takedown_editor_id_idx ON public.takedown USING btree (editor_id) WHERE (editor_id IS NOT NULL);


--
-- Name: takedown_put_back_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX takedown_put_back_by_idx ON public.takedown USING btree (put_back_by) WHERE (put_back_by IS NOT NULL);


--
-- Name: takedown_subject_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX takedown_subject_idx ON public.takedown USING btree (subject_id);


--
-- Name: takedown_taken_down_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX takedown_taken_down_at_idx ON public.takedown USING btree (taken_down_at);


--
-- Name: point_batch_2026_10_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2026_10_pkey;


--
-- Name: point_batch_2026_11_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2026_11_pkey;


--
-- Name: point_batch_2026_12_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2026_12_pkey;


--
-- Name: point_batch_2027_01_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2027_01_pkey;


--
-- Name: point_batch_2027_02_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2027_02_pkey;


--
-- Name: point_batch_2027_03_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2027_03_pkey;


--
-- Name: point_batch_2027_04_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2027_04_pkey;


--
-- Name: point_batch_2027_05_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2027_05_pkey;


--
-- Name: point_batch_2027_06_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2027_06_pkey;


--
-- Name: point_batch_2027_07_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2027_07_pkey;


--
-- Name: point_batch_2027_08_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2027_08_pkey;


--
-- Name: point_batch_2027_09_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2027_09_pkey;


--
-- Name: point_batch_2027_10_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2027_10_pkey;


--
-- Name: point_batch_2027_11_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2027_11_pkey;


--
-- Name: point_batch_2027_12_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2027_12_pkey;


--
-- Name: point_batch_2028_01_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2028_01_pkey;


--
-- Name: point_batch_2028_02_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2028_02_pkey;


--
-- Name: point_batch_2028_03_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2028_03_pkey;


--
-- Name: point_batch_2028_04_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2028_04_pkey;


--
-- Name: point_batch_2028_05_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2028_05_pkey;


--
-- Name: point_batch_2028_06_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2028_06_pkey;


--
-- Name: point_batch_2028_07_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2028_07_pkey;


--
-- Name: point_batch_2028_08_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2028_08_pkey;


--
-- Name: point_batch_2028_09_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2028_09_pkey;


--
-- Name: point_batch_2028_10_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2028_10_pkey;


--
-- Name: point_batch_2028_11_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2028_11_pkey;


--
-- Name: point_batch_2028_12_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_2028_12_pkey;


--
-- Name: point_batch_default_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.point_batch_pkey ATTACH PARTITION public.point_batch_default_pkey;


--
-- Name: contribution contribution_hide_stamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER contribution_hide_stamp BEFORE UPDATE ON public.contribution FOR EACH ROW EXECUTE FUNCTION private.contribution_hide_stamp();


--
-- Name: contribution contribution_stamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER contribution_stamp BEFORE INSERT ON public.contribution FOR EACH ROW EXECUTE FUNCTION private.contribution_stamp();


--
-- Name: contributor contributor_stamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER contributor_stamp BEFORE INSERT ON public.contributor FOR EACH ROW EXECUTE FUNCTION private.contributor_stamp();


--
-- Name: contributor contributor_unlink_contributions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER contributor_unlink_contributions BEFORE DELETE ON public.contributor FOR EACH ROW EXECUTE FUNCTION private.unlink_contributions();


--
-- Name: draft draft_revision; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER draft_revision BEFORE UPDATE ON public.draft FOR EACH ROW EXECUTE FUNCTION private.draft_revision();


--
-- Name: draft draft_saver; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER draft_saver BEFORE UPDATE ON public.draft FOR EACH ROW EXECUTE FUNCTION private.draft_saver();


--
-- Name: hinto hinto_cap; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER hinto_cap BEFORE INSERT ON public.hinto FOR EACH ROW EXECUTE FUNCTION private.hinto_cap();


--
-- Name: point_batch point_batch_stamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER point_batch_stamp BEFORE INSERT ON public.point_batch FOR EACH ROW EXECUTE FUNCTION private.point_batch_stamp();


--
-- Name: route route_approved_ends; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER route_approved_ends BEFORE INSERT OR UPDATE OF status, head_stop_id, tail_stop_id ON public.route FOR EACH ROW EXECUTE FUNCTION private.route_ends_approved();


--
-- Name: route route_loop_fixed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER route_loop_fixed BEFORE UPDATE OF is_loop ON public.route FOR EACH ROW EXECUTE FUNCTION private.loop_fixed();


--
-- Name: route route_revision; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER route_revision BEFORE UPDATE ON public.route FOR EACH ROW EXECUTE FUNCTION private.bump_revision();


--
-- Name: route_stop route_stop_bumps_subjects; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER route_stop_bumps_subjects AFTER INSERT OR DELETE OR UPDATE ON public.route_stop FOR EACH ROW EXECUTE FUNCTION private.link_bumps_subjects();


--
-- Name: route route_takedown_log; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER route_takedown_log AFTER UPDATE OF status ON public.route FOR EACH ROW EXECUTE FUNCTION private.log_takedown();


--
-- Name: route route_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER route_touch BEFORE UPDATE ON public.route FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: route_variant route_variant_bumps_route; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER route_variant_bumps_route AFTER INSERT OR DELETE OR UPDATE ON public.route_variant FOR EACH ROW EXECUTE FUNCTION private.direction_bumps_route();


--
-- Name: route_variant route_variant_loop_one_way; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER route_variant_loop_one_way BEFORE INSERT OR UPDATE OF route_id, reversed ON public.route_variant FOR EACH ROW EXECUTE FUNCTION private.loop_one_way();


--
-- Name: route_variant route_variant_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER route_variant_touch BEFORE UPDATE ON public.route_variant FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: stop stop_revision; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER stop_revision BEFORE UPDATE ON public.stop FOR EACH ROW EXECUTE FUNCTION private.bump_revision();


--
-- Name: stop stop_takedown_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER stop_takedown_guard BEFORE UPDATE OF status ON public.stop FOR EACH ROW EXECUTE FUNCTION private.stop_takedown_guard();


--
-- Name: stop stop_takedown_log; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER stop_takedown_log AFTER UPDATE OF status ON public.stop FOR EACH ROW EXECUTE FUNCTION private.log_takedown();


--
-- Name: stop stop_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER stop_touch BEFORE UPDATE ON public.stop FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: claim_token claim_token_anonymous_id_fkey; Type: FK CONSTRAINT; Schema: private; Owner: -
--

ALTER TABLE ONLY private.claim_token
    ADD CONSTRAINT claim_token_anonymous_id_fkey FOREIGN KEY (anonymous_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: claim_token claim_token_claimed_by_fkey; Type: FK CONSTRAINT; Schema: private; Owner: -
--

ALTER TABLE ONLY private.claim_token
    ADD CONSTRAINT claim_token_claimed_by_fkey FOREIGN KEY (claimed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: contributor_retired_totals contributor_retired_totals_contributor_id_fkey; Type: FK CONSTRAINT; Schema: private; Owner: -
--

ALTER TABLE ONLY private.contributor_retired_totals
    ADD CONSTRAINT contributor_retired_totals_contributor_id_fkey FOREIGN KEY (contributor_id) REFERENCES public.contributor(id) ON DELETE CASCADE;


--
-- Name: editor editor_user_id_fkey; Type: FK CONSTRAINT; Schema: private; Owner: -
--

ALTER TABLE ONLY private.editor
    ADD CONSTRAINT editor_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: contribution contribution_contributor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution
    ADD CONSTRAINT contribution_contributor_id_fkey FOREIGN KEY (contributor_id) REFERENCES public.contributor(id) ON DELETE CASCADE;


--
-- Name: contribution contribution_hidden_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution
    ADD CONSTRAINT contribution_hidden_by_fkey FOREIGN KEY (hidden_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: contribution_use contribution_use_contribution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_use
    ADD CONSTRAINT contribution_use_contribution_id_fkey FOREIGN KEY (contribution_id) REFERENCES public.contribution(id) ON DELETE CASCADE;


--
-- Name: contribution_use contribution_use_editor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_use
    ADD CONSTRAINT contribution_use_editor_id_fkey FOREIGN KEY (editor_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: contributor contributor_blocked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contributor
    ADD CONSTRAINT contributor_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: contributor contributor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contributor
    ADD CONSTRAINT contributor_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: draft draft_editor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft
    ADD CONSTRAINT draft_editor_id_fkey FOREIGN KEY (editor_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: draft draft_last_saved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft
    ADD CONSTRAINT draft_last_saved_by_fkey FOREIGN KEY (last_saved_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: editor_name editor_name_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.editor_name
    ADD CONSTRAINT editor_name_user_id_fkey FOREIGN KEY (user_id) REFERENCES private.editor(user_id) ON DELETE CASCADE;


--
-- Name: hinto hinto_contribution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hinto
    ADD CONSTRAINT hinto_contribution_id_fkey FOREIGN KEY (contribution_id) REFERENCES public.contribution(id) ON DELETE CASCADE;


--
-- Name: point_batch point_batch_contribution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.point_batch
    ADD CONSTRAINT point_batch_contribution_id_fkey FOREIGN KEY (contribution_id) REFERENCES public.contribution(id) ON DELETE CASCADE;


--
-- Name: route route_head_stop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route
    ADD CONSTRAINT route_head_stop_id_fkey FOREIGN KEY (head_stop_id) REFERENCES public.stop(id);


--
-- Name: route route_last_saved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route
    ADD CONSTRAINT route_last_saved_by_fkey FOREIGN KEY (last_saved_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: route route_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route
    ADD CONSTRAINT route_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);


--
-- Name: route route_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route
    ADD CONSTRAINT route_published_by_fkey FOREIGN KEY (published_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: route_stop route_stop_route_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_stop
    ADD CONSTRAINT route_stop_route_variant_id_fkey FOREIGN KEY (route_variant_id) REFERENCES public.route_variant(id) ON DELETE CASCADE;


--
-- Name: route_stop route_stop_stop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_stop
    ADD CONSTRAINT route_stop_stop_id_fkey FOREIGN KEY (stop_id) REFERENCES public.stop(id) ON DELETE CASCADE;


--
-- Name: route route_tail_stop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route
    ADD CONSTRAINT route_tail_stop_id_fkey FOREIGN KEY (tail_stop_id) REFERENCES public.stop(id);


--
-- Name: route_variant route_variant_borrowed_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_variant
    ADD CONSTRAINT route_variant_borrowed_from_fkey FOREIGN KEY (borrowed_from) REFERENCES public.route_variant(id) ON DELETE SET NULL;


--
-- Name: route_variant route_variant_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_variant
    ADD CONSTRAINT route_variant_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);


--
-- Name: route_variant route_variant_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_variant
    ADD CONSTRAINT route_variant_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.route(id) ON DELETE CASCADE;


--
-- Name: stop stop_last_saved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop
    ADD CONSTRAINT stop_last_saved_by_fkey FOREIGN KEY (last_saved_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: stop stop_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop
    ADD CONSTRAINT stop_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);


--
-- Name: stop stop_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop
    ADD CONSTRAINT stop_published_by_fkey FOREIGN KEY (published_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: takedown takedown_editor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.takedown
    ADD CONSTRAINT takedown_editor_id_fkey FOREIGN KEY (editor_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: takedown takedown_put_back_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.takedown
    ADD CONSTRAINT takedown_put_back_by_fkey FOREIGN KEY (put_back_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: claim_token; Type: ROW SECURITY; Schema: private; Owner: -
--

ALTER TABLE private.claim_token ENABLE ROW LEVEL SECURITY;

--
-- Name: contributor_retired_totals; Type: ROW SECURITY; Schema: private; Owner: -
--

ALTER TABLE private.contributor_retired_totals ENABLE ROW LEVEL SECURITY;

--
-- Name: editor; Type: ROW SECURITY; Schema: private; Owner: -
--

ALTER TABLE private.editor ENABLE ROW LEVEL SECURITY;

--
-- Name: contribution; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contribution ENABLE ROW LEVEL SECURITY;

--
-- Name: contribution_use; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contribution_use ENABLE ROW LEVEL SECURITY;

--
-- Name: contributor; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contributor ENABLE ROW LEVEL SECURITY;

--
-- Name: draft; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.draft ENABLE ROW LEVEL SECURITY;

--
-- Name: draft draft_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY draft_delete ON public.draft FOR DELETE TO authenticated USING ((( SELECT private.is_editor() AS is_editor) AND (editor_id = ( SELECT auth.uid() AS uid))));


--
-- Name: draft draft_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY draft_insert ON public.draft FOR INSERT TO authenticated WITH CHECK ((( SELECT private.is_editor() AS is_editor) AND (editor_id = ( SELECT auth.uid() AS uid))));


--
-- Name: draft draft_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY draft_select ON public.draft FOR SELECT TO authenticated USING (( SELECT private.is_editor() AS is_editor));


--
-- Name: draft draft_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY draft_update ON public.draft FOR UPDATE TO authenticated USING ((( SELECT private.is_editor() AS is_editor) AND ((editor_id = ( SELECT auth.uid() AS uid)) OR (editor_id IS NULL)))) WITH CHECK ((( SELECT private.is_editor() AS is_editor) AND ((editor_id = ( SELECT auth.uid() AS uid)) OR (editor_id IS NULL))));


--
-- Name: editor_name; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.editor_name ENABLE ROW LEVEL SECURITY;

--
-- Name: editor_name editor_name_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY editor_name_select ON public.editor_name FOR SELECT TO authenticated USING (( SELECT private.is_editor() AS is_editor));


--
-- Name: contribution_use editors add uses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "editors add uses" ON public.contribution_use FOR INSERT TO authenticated WITH CHECK ((( SELECT private.is_editor() AS is_editor) AND (editor_id = ( SELECT auth.uid() AS uid))));


--
-- Name: contribution_use editors delete uses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "editors delete uses" ON public.contribution_use FOR DELETE TO authenticated USING (( SELECT private.is_editor() AS is_editor));


--
-- Name: contribution editors hide; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "editors hide" ON public.contribution FOR UPDATE TO authenticated USING (( SELECT private.is_editor() AS is_editor)) WITH CHECK (( SELECT private.is_editor() AS is_editor));


--
-- Name: hinto editors read hintos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "editors read hintos" ON public.hinto FOR SELECT TO authenticated USING (( SELECT private.is_editor() AS is_editor));


--
-- Name: point_batch editors read points; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "editors read points" ON public.point_batch FOR SELECT TO authenticated USING (( SELECT private.is_editor() AS is_editor));


--
-- Name: contribution_use editors read uses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "editors read uses" ON public.contribution_use FOR SELECT TO authenticated USING (( SELECT private.is_editor() AS is_editor));


--
-- Name: hinto; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hinto ENABLE ROW LEVEL SECURITY;

--
-- Name: hinto phone adds hintos to its own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "phone adds hintos to its own" ON public.hinto FOR INSERT TO authenticated WITH CHECK ((( SELECT private.can_contribute() AS can_contribute) AND (EXISTS ( SELECT 1
   FROM public.contribution c
  WHERE ((c.id = hinto.contribution_id) AND (c.contributor_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: contribution phone adds its own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "phone adds its own" ON public.contribution FOR INSERT TO authenticated WITH CHECK (((contributor_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.can_contribute() AS can_contribute)));


--
-- Name: contributor phone adds itself; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "phone adds itself" ON public.contributor FOR INSERT TO authenticated WITH CHECK ((id = ( SELECT auth.uid() AS uid)));


--
-- Name: point_batch phone adds points to its own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "phone adds points to its own" ON public.point_batch FOR INSERT TO authenticated WITH CHECK ((( SELECT private.can_contribute() AS can_contribute) AND (EXISTS ( SELECT 1
   FROM public.contribution c
  WHERE ((c.id = point_batch.contribution_id) AND (c.contributor_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: contribution phone or editor deletes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "phone or editor deletes" ON public.contribution FOR DELETE TO authenticated USING (((contributor_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_editor() AS is_editor)));


--
-- Name: contribution phone or editor reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "phone or editor reads" ON public.contribution FOR SELECT TO authenticated USING (((contributor_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_editor() AS is_editor)));


--
-- Name: contributor phone or editor reads contributors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "phone or editor reads contributors" ON public.contributor FOR SELECT TO authenticated USING (((id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_editor() AS is_editor)));


--
-- Name: point_batch; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2026_10; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2026_10 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2026_11; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2026_11 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2026_12; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2026_12 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2027_01; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2027_01 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2027_02; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2027_02 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2027_03; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2027_03 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2027_04; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2027_04 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2027_05; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2027_05 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2027_06; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2027_06 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2027_07; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2027_07 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2027_08; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2027_08 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2027_09; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2027_09 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2027_10; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2027_10 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2027_11; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2027_11 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2027_12; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2027_12 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2028_01; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2028_01 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2028_02; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2028_02 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2028_03; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2028_03 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2028_04; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2028_04 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2028_05; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2028_05 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2028_06; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2028_06 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2028_07; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2028_07 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2028_08; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2028_08 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2028_09; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2028_09 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2028_10; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2028_10 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2028_11; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2028_11 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_2028_12; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_2028_12 ENABLE ROW LEVEL SECURITY;

--
-- Name: point_batch_default; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_batch_default ENABLE ROW LEVEL SECURITY;

--
-- Name: route; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.route ENABLE ROW LEVEL SECURITY;

--
-- Name: route route_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY route_delete ON public.route FOR DELETE TO authenticated USING (( SELECT private.is_editor() AS is_editor));


--
-- Name: route route_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY route_insert ON public.route FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = owner_id) AND ( SELECT private.is_editor() AS is_editor)));


--
-- Name: route route_read_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY route_read_approved ON public.route FOR SELECT TO anon, authenticated USING ((status = 'approved'::text));


--
-- Name: route route_read_editor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY route_read_editor ON public.route FOR SELECT TO authenticated USING (( SELECT private.is_editor() AS is_editor));


--
-- Name: route_stop; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.route_stop ENABLE ROW LEVEL SECURITY;

--
-- Name: route_stop route_stop_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY route_stop_delete ON public.route_stop FOR DELETE TO authenticated USING (( SELECT private.is_editor() AS is_editor));


--
-- Name: route_stop route_stop_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY route_stop_insert ON public.route_stop FOR INSERT TO authenticated WITH CHECK (( SELECT private.is_editor() AS is_editor));


--
-- Name: route_stop route_stop_read_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY route_stop_read_approved ON public.route_stop FOR SELECT TO anon, authenticated USING (((EXISTS ( SELECT 1
   FROM (public.route_variant v
     JOIN public.route r ON ((r.id = v.route_id)))
  WHERE ((v.id = route_stop.route_variant_id) AND (r.status = 'approved'::text)))) AND (EXISTS ( SELECT 1
   FROM public.stop s
  WHERE ((s.id = route_stop.stop_id) AND (s.status = 'approved'::text))))));


--
-- Name: route_stop route_stop_read_editor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY route_stop_read_editor ON public.route_stop FOR SELECT TO authenticated USING (( SELECT private.is_editor() AS is_editor));


--
-- Name: route_stop route_stop_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY route_stop_update ON public.route_stop FOR UPDATE TO authenticated USING (( SELECT private.is_editor() AS is_editor)) WITH CHECK (( SELECT private.is_editor() AS is_editor));


--
-- Name: route route_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY route_update ON public.route FOR UPDATE TO authenticated USING (( SELECT private.is_editor() AS is_editor)) WITH CHECK (( SELECT private.is_editor() AS is_editor));


--
-- Name: route_variant; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.route_variant ENABLE ROW LEVEL SECURITY;

--
-- Name: route_variant route_variant_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY route_variant_delete ON public.route_variant FOR DELETE TO authenticated USING (( SELECT private.is_editor() AS is_editor));


--
-- Name: route_variant route_variant_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY route_variant_insert ON public.route_variant FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = owner_id) AND ( SELECT private.is_editor() AS is_editor)));


--
-- Name: route_variant route_variant_read_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY route_variant_read_approved ON public.route_variant FOR SELECT TO anon, authenticated USING ((EXISTS ( SELECT 1
   FROM public.route r
  WHERE ((r.id = route_variant.route_id) AND (r.status = 'approved'::text)))));


--
-- Name: route_variant route_variant_read_editor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY route_variant_read_editor ON public.route_variant FOR SELECT TO authenticated USING (( SELECT private.is_editor() AS is_editor));


--
-- Name: route_variant route_variant_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY route_variant_update ON public.route_variant FOR UPDATE TO authenticated USING (( SELECT private.is_editor() AS is_editor)) WITH CHECK (( SELECT private.is_editor() AS is_editor));


--
-- Name: stop; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stop ENABLE ROW LEVEL SECURITY;

--
-- Name: stop stop_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stop_delete ON public.stop FOR DELETE TO authenticated USING (( SELECT private.is_editor() AS is_editor));


--
-- Name: stop stop_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stop_insert ON public.stop FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = owner_id) AND ( SELECT private.is_editor() AS is_editor)));


--
-- Name: stop stop_read_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stop_read_approved ON public.stop FOR SELECT TO anon, authenticated USING ((status = 'approved'::text));


--
-- Name: stop stop_read_editor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stop_read_editor ON public.stop FOR SELECT TO authenticated USING (( SELECT private.is_editor() AS is_editor));


--
-- Name: stop stop_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stop_update ON public.stop FOR UPDATE TO authenticated USING (( SELECT private.is_editor() AS is_editor)) WITH CHECK (( SELECT private.is_editor() AS is_editor));


--
-- Name: takedown; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.takedown ENABLE ROW LEVEL SECURITY;

--
-- Name: takedown takedown_read_editor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY takedown_read_editor ON public.takedown FOR SELECT TO authenticated USING (( SELECT private.is_editor() AS is_editor));


--
-- Name: takedown takedown_read_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY takedown_read_public ON public.takedown FOR SELECT TO anon USING (true);


--
-- Name: SCHEMA private; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO supabase_auth_admin;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION add_months(n integer); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.add_months(n integer) FROM PUBLIC;


--
-- Name: FUNCTION add_retired_totals(more private.contributor_retired_totals); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.add_retired_totals(more private.contributor_retired_totals) FROM PUBLIC;


--
-- Name: FUNCTION apply_draft(p_draft uuid); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.apply_draft(p_draft uuid) FROM PUBLIC;


--
-- Name: FUNCTION before_user_created(event jsonb); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.before_user_created(event jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION private.before_user_created(event jsonb) TO supabase_auth_admin;


--
-- Name: FUNCTION bump_revision(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.bump_revision() FROM PUBLIC;
GRANT ALL ON FUNCTION private.bump_revision() TO authenticated;


--
-- Name: FUNCTION can_contribute(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.can_contribute() FROM PUBLIC;
GRANT ALL ON FUNCTION private.can_contribute() TO authenticated;


--
-- Name: FUNCTION carry_retired_month(first_day date); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.carry_retired_month(first_day date) FROM PUBLIC;


--
-- Name: FUNCTION contribution_hide_stamp(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.contribution_hide_stamp() FROM PUBLIC;


--
-- Name: FUNCTION contribution_stamp(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.contribution_stamp() FROM PUBLIC;


--
-- Name: FUNCTION contributor_stamp(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.contributor_stamp() FROM PUBLIC;


--
-- Name: FUNCTION direction_bumps_route(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.direction_bumps_route() FROM PUBLIC;
GRANT ALL ON FUNCTION private.direction_bumps_route() TO authenticated;


--
-- Name: FUNCTION distance_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.distance_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision) FROM PUBLIC;


--
-- Name: FUNCTION draft_revision(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.draft_revision() FROM PUBLIC;
GRANT ALL ON FUNCTION private.draft_revision() TO authenticated;


--
-- Name: FUNCTION draft_saver(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.draft_saver() FROM PUBLIC;


--
-- Name: FUNCTION hinto_cap(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.hinto_cap() FROM PUBLIC;


--
-- Name: FUNCTION is_account(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.is_account() FROM PUBLIC;
GRANT ALL ON FUNCTION private.is_account() TO authenticated;


--
-- Name: FUNCTION is_editor(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.is_editor() FROM PUBLIC;
GRANT ALL ON FUNCTION private.is_editor() TO authenticated;


--
-- Name: FUNCTION last_piece_month(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.last_piece_month() FROM PUBLIC;


--
-- Name: FUNCTION link_bumps_subjects(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.link_bumps_subjects() FROM PUBLIC;


--
-- Name: FUNCTION link_ok(l jsonb, ref text); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.link_ok(l jsonb, ref text) FROM PUBLIC;


--
-- Name: FUNCTION lock_rows(p_routes uuid[], p_stops uuid[]); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.lock_rows(p_routes uuid[], p_stops uuid[]) FROM PUBLIC;


--
-- Name: FUNCTION log_takedown(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.log_takedown() FROM PUBLIC;
GRANT ALL ON FUNCTION private.log_takedown() TO authenticated;


--
-- Name: FUNCTION loop_fixed(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.loop_fixed() FROM PUBLIC;
GRANT ALL ON FUNCTION private.loop_fixed() TO authenticated;


--
-- Name: FUNCTION loop_one_way(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.loop_one_way() FROM PUBLIC;
GRANT ALL ON FUNCTION private.loop_one_way() TO authenticated;


--
-- Name: FUNCTION payload_of(p_kind text, p_subject_id uuid); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.payload_of(p_kind text, p_subject_id uuid) FROM PUBLIC;


--
-- Name: FUNCTION payload_ok(p_kind text, p jsonb); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.payload_ok(p_kind text, p jsonb) FROM PUBLIC;


--
-- Name: FUNCTION point_batch_stamp(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.point_batch_stamp() FROM PUBLIC;


--
-- Name: FUNCTION refusal(c text); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.refusal(c text) FROM PUBLIC;


--
-- Name: FUNCTION require_editor(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.require_editor() FROM PUBLIC;


--
-- Name: FUNCTION retire_month(target_month date, min_age_months integer); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.retire_month(target_month date, min_age_months integer) FROM PUBLIC;


--
-- Name: FUNCTION ride_totals(who uuid, received_from timestamp with time zone, received_before timestamp with time zone, days_after date); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.ride_totals(who uuid, received_from timestamp with time zone, received_before timestamp with time zone, days_after date) FROM PUBLIC;


--
-- Name: FUNCTION route_ends_approved(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.route_ends_approved() FROM PUBLIC;
GRANT ALL ON FUNCTION private.route_ends_approved() TO authenticated;


--
-- Name: FUNCTION stop_takedown_guard(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.stop_takedown_guard() FROM PUBLIC;
GRANT ALL ON FUNCTION private.stop_takedown_guard() TO authenticated;


--
-- Name: FUNCTION text_list(v jsonb); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.text_list(v jsonb) FROM PUBLIC;


--
-- Name: FUNCTION trim_line_ends(line jsonb, metres double precision); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.trim_line_ends(line jsonb, metres double precision) FROM PUBLIC;


--
-- Name: FUNCTION unlink_contributions(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.unlink_contributions() FROM PUBLIC;


--
-- Name: FUNCTION uuid_ok(v jsonb); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.uuid_ok(v jsonb) FROM PUBLIC;


--
-- Name: FUNCTION am_i_editor(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.am_i_editor() FROM PUBLIC;
GRANT ALL ON FUNCTION public.am_i_editor() TO authenticated;


--
-- Name: FUNCTION approve_draft(p_draft uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.approve_draft(p_draft uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.approve_draft(p_draft uuid) TO authenticated;


--
-- Name: FUNCTION approve_reviewed_draft(p_draft uuid, p_revision integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.approve_reviewed_draft(p_draft uuid, p_revision integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.approve_reviewed_draft(p_draft uuid, p_revision integer) TO authenticated;


--
-- Name: FUNCTION begin_claim(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.begin_claim() FROM PUBLIC;
GRANT ALL ON FUNCTION public.begin_claim() TO authenticated;


--
-- Name: FUNCTION block_contributor(target uuid, note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.block_contributor(target uuid, note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.block_contributor(target uuid, note text) TO authenticated;


--
-- Name: FUNCTION claim_draft(p_kind text, p_subject_id uuid, p_is_new boolean, p_base_revision bigint, p_payload jsonb, p_note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.claim_draft(p_kind text, p_subject_id uuid, p_is_new boolean, p_base_revision bigint, p_payload jsonb, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_draft(p_kind text, p_subject_id uuid, p_is_new boolean, p_base_revision bigint, p_payload jsonb, p_note text) TO authenticated;


--
-- Name: FUNCTION delete_my_account(delete_uploads boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.delete_my_account(delete_uploads boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_my_account(delete_uploads boolean) TO authenticated;


--
-- Name: FUNCTION discard_draft(p_draft uuid, p_revision integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.discard_draft(p_draft uuid, p_revision integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.discard_draft(p_draft uuid, p_revision integer) TO authenticated;


--
-- Name: FUNCTION finish_claim(token uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.finish_claim(token uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.finish_claim(token uuid) TO authenticated;


--
-- Name: FUNCTION get_my_stats(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_my_stats() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_my_stats() TO authenticated;


--
-- Name: FUNCTION get_profile(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_profile() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_profile() TO authenticated;


--
-- Name: FUNCTION publish_draft(p_draft uuid, p_revision integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.publish_draft(p_draft uuid, p_revision integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.publish_draft(p_draft uuid, p_revision integer) TO authenticated;


--
-- Name: FUNCTION put_back(p_kind text, p_subject_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.put_back(p_kind text, p_subject_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.put_back(p_kind text, p_subject_id uuid) TO authenticated;


--
-- Name: FUNCTION refresh_draft_base(p_draft uuid, p_revision integer, p_base_revision bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.refresh_draft_base(p_draft uuid, p_revision integer, p_base_revision bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.refresh_draft_base(p_draft uuid, p_revision integer, p_base_revision bigint) TO authenticated;


--
-- Name: FUNCTION save_contribution(recording jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.save_contribution(recording jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.save_contribution(recording jsonb) TO authenticated;


--
-- Name: FUNCTION save_draft(p_draft uuid, p_revision integer, p_payload jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.save_draft(p_draft uuid, p_revision integer, p_payload jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.save_draft(p_draft uuid, p_revision integer, p_payload jsonb) TO authenticated;


--
-- Name: FUNCTION send_back_draft(p_draft uuid, p_revision integer, p_note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.send_back_draft(p_draft uuid, p_revision integer, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.send_back_draft(p_draft uuid, p_revision integer, p_note text) TO authenticated;


--
-- Name: FUNCTION set_profile(name text, phone text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_profile(name text, phone text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_profile(name text, phone text) TO authenticated;


--
-- Name: FUNCTION submit_draft(p_draft uuid, p_revision integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.submit_draft(p_draft uuid, p_revision integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.submit_draft(p_draft uuid, p_revision integer) TO authenticated;


--
-- Name: FUNCTION take_down(p_kind text, p_subject_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.take_down(p_kind text, p_subject_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.take_down(p_kind text, p_subject_id uuid) TO authenticated;


--
-- Name: FUNCTION unblock_contributor(target uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.unblock_contributor(target uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.unblock_contributor(target uuid) TO authenticated;


--
-- Name: FUNCTION unpublish(p_kind text, p_subject_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.unpublish(p_kind text, p_subject_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.unpublish(p_kind text, p_subject_id uuid) TO authenticated;


--
-- Name: TABLE contribution; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE ON TABLE public.contribution TO authenticated;


--
-- Name: COLUMN contribution.hidden_at; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(hidden_at) ON TABLE public.contribution TO authenticated;


--
-- Name: COLUMN contribution.hidden_note; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(hidden_note) ON TABLE public.contribution TO authenticated;


--
-- Name: TABLE contribution_use; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE ON TABLE public.contribution_use TO authenticated;


--
-- Name: COLUMN contributor.id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(id),INSERT(id) ON TABLE public.contributor TO authenticated;


--
-- Name: COLUMN contributor.first_seen_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(first_seen_at) ON TABLE public.contributor TO authenticated;


--
-- Name: COLUMN contributor.blocked_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(blocked_at) ON TABLE public.contributor TO authenticated;


--
-- Name: COLUMN contributor.blocked_by; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(blocked_by) ON TABLE public.contributor TO authenticated;


--
-- Name: COLUMN contributor.block_note; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(block_note) ON TABLE public.contributor TO authenticated;


--
-- Name: COLUMN contributor.name; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(name) ON TABLE public.contributor TO authenticated;


--
-- Name: COLUMN contributor.profile_updated_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(profile_updated_at) ON TABLE public.contributor TO authenticated;


--
-- Name: TABLE draft; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE ON TABLE public.draft TO authenticated;


--
-- Name: COLUMN draft.status; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(status) ON TABLE public.draft TO authenticated;


--
-- Name: COLUMN draft.payload; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(payload) ON TABLE public.draft TO authenticated;


--
-- Name: COLUMN draft.note; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(note) ON TABLE public.draft TO authenticated;


--
-- Name: COLUMN draft.submitted_at; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(submitted_at) ON TABLE public.draft TO authenticated;


--
-- Name: TABLE editor_name; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.editor_name TO authenticated;


--
-- Name: TABLE hinto; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.hinto TO authenticated;


--
-- Name: TABLE point_batch; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.point_batch TO authenticated;


--
-- Name: TABLE route; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.route TO anon;
GRANT SELECT ON TABLE public.route TO authenticated;


--
-- Name: TABLE route_stop; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.route_stop TO anon;
GRANT SELECT ON TABLE public.route_stop TO authenticated;


--
-- Name: TABLE route_variant; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.route_variant TO anon;
GRANT SELECT ON TABLE public.route_variant TO authenticated;


--
-- Name: TABLE stop; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.stop TO anon;
GRANT SELECT ON TABLE public.stop TO authenticated;


--
-- Name: TABLE takedown; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.takedown TO authenticated;


--
-- Name: COLUMN takedown.kind; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(kind) ON TABLE public.takedown TO anon;


--
-- Name: COLUMN takedown.subject_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(subject_id) ON TABLE public.takedown TO anon;


--
-- Name: COLUMN takedown.taken_down_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(taken_down_at) ON TABLE public.takedown TO anon;


--
-- Name: COLUMN takedown.put_back_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(put_back_at) ON TABLE public.takedown TO anon;


--
-- PostgreSQL database dump complete
--


