-- ParaPo — undo the account_stats migration. Refuses, changing nothing, while
-- any contribution holds a walk and ride split or any contributor has retired
-- totals: neither can be made again once dropped. Puts back
-- save_contribution, private.retire_month and finish_claim as
-- 20261019125900_contributions, 20261022090000_contribution_use and
-- 20261024090000_contributor_accounts made them. An app that sends the split
-- keeps saving after it: the old save_contribution ignores them. Safe to run twice.
begin;
do $$
begin
  -- Nested: a statement naming a missing column or table is planned only once it is known to exist.
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'contribution' and column_name = 'walk_m') then
    if exists (select 1 from public.contribution where walk_m is not null) then
      raise exception 'account_stats revert: a contribution holds a walk and ride split, so it is not undone. Nothing was changed.';
    end if;
  end if;
  if to_regclass('private.contributor_retired_totals') is not null then
    if exists (select 1 from private.contributor_retired_totals) then
      raise exception 'account_stats revert: retired totals are stored, so it is not undone. Nothing was changed.';
    end if;
  end if;
end $$;
drop function if exists public.get_my_stats();

-- As 20261019125900_contributions.sql made it.
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

-- As 20261022090000_contribution_use.sql made it.
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

-- As 20261024090000_contributor_accounts.sql made it.
create or replace function public.finish_claim(token uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  who uuid := (select auth.uid());
  t private.claim_token;
  moved integer;
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
  delete from public.contributor where id = t.anonymous_id;

  update private.claim_token set used_at = now(), claimed_by = who where private.claim_token.token = t.token;
  return moved;
end $$;

drop function if exists private.carry_retired_month(date);
drop function if exists private.add_retired_totals(private.contributor_retired_totals);
drop function if exists private.ride_totals(uuid, timestamptz, timestamptz, date);
drop table if exists private.contributor_retired_totals;
alter table public.contribution
  drop column if exists walk_m, drop column if exists ride_m,
  drop column if exists walk_s, drop column if exists ride_s;
delete from supabase_migrations.schema_migrations where name = 'account_stats';
commit;
