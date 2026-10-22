-- ParaPo — contribution_use, blocking a phone, and the retention step
--
-- Finishes ticket contribute/08 after 20261019125900_contributions.sql, which
-- made contributor, contribution, point_batch (monthly pieces and a default),
-- hinto, their caps, row security and save_contribution. Three pieces were
-- left (.scratch/contribute/database.md sections 3, 4 and 6):
--
--   contribution_use       which contribution an editor used, for a direction
--                          ("Use this line") or a hintuan ("Draw a hintuan
--                          here"). The labels for machine learning. No foreign
--                          key on subject_id, on purpose: a direction exists
--                          only as a draft until approved, and a discarded
--                          draft leaves a link to nothing that the export skips.
--   public.block_contributor / public.unblock_contributor
--                          an editor sets or clears blocked_at, with a note.
--                          In public so the studio can call them through the
--                          API (private is not exposed), as 0022's functions.
--                          A blocked phone fails private.can_contribute(), so
--                          it adds nothing.
--   private.retire_month / private.add_months
--                          the owner's monthly and yearly steps (section 6).
--
-- Who may do what:
--   a phone   nothing here. It has no grant on contribution_use and none on
--             contributor beyond select and insert, so it cannot unblock
--             itself (no update, no delete, and the stamp trigger clears the
--             block columns on any insert). Deleting its recordings still
--             removes its uses: they cascade from contribution.
--   editors   read, add and delete contribution_use. Block and unblock a phone
--             through the two functions; each checks private.is_editor() itself.
--   anon      nothing at all.
--   the owner (SQL editor, as postgres) alone runs retire_month and add_months;
--             no API role can execute them.
--
-- The owner's steps:
--   Monthly, from November 2028 (24 months after the first uploads):
--     select private.retire_month(date '2026-10-01');
--   (the first month; run it in November 2028, then each month after). It drops that month's piece of point_batch, cuts 200 m off each end of the
--   month's lines, deletes the hintos within 200 m of the old ends, clears the
--   start name, end name and description, and unlinks the contributions from
--   their phones. The line, times, totals, hintos, vehicle and contribution_use
--   stay. It refuses a month newer than 24 months old; to try it on a test
--   month, call private.retire_month(month, 0) inside begin ... rollback.
--   Yearly: select private.add_months(12); so pieces always exist ahead. The
--   monthly call warns when fewer than six remain.
--   Also monthly: delete anonymous users older than 30 days that never saved a
--   contribution (nothing cleans them up automatically).
--
-- Left for later: dropping gps_session; editor update of line, rules_version
-- and the box, and editor insert and delete of hinto, for recounting.
--
-- Written, not applied: the owner applies it.

-- ------------------------------------------------------- contribution_use

create table public.contribution_use (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contribution (id) on delete cascade,
  kind text not null check (kind in ('direction', 'hintuan')),
  subject_id uuid not null,
  editor_id uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (contribution_id, kind, subject_id)
);
create index contribution_use_subject on public.contribution_use (subject_id);
create index contribution_use_editor on public.contribution_use (editor_id);

alter table public.contribution_use enable row level security;
revoke all on public.contribution_use from anon, authenticated;
grant select, insert, delete on public.contribution_use to authenticated;

create policy "editors read uses" on public.contribution_use for select to authenticated
  using ((select private.is_editor()));
create policy "editors add uses" on public.contribution_use for insert to authenticated
  with check ((select private.is_editor()) and editor_id = (select auth.uid()));
create policy "editors delete uses" on public.contribution_use for delete to authenticated
  using ((select private.is_editor()));

-- ------------------------------------------------------ block and unblock

create function public.block_contributor(target uuid, note text default null)
returns void language plpgsql security definer set search_path = '' as $$
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

create function public.unblock_contributor(target uuid)
returns void language plpgsql security definer set search_path = '' as $$
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

revoke all on function public.block_contributor(uuid, text) from public, anon;
revoke all on function public.unblock_contributor(uuid) from public, anon;
grant execute on function public.block_contributor(uuid, text) to authenticated;
grant execute on function public.unblock_contributor(uuid) to authenticated;

-- --------------------------------------------------------------- retention

-- Metres between two points, flat-earth as the point trigger measures speed;
-- over 200 m the error is far below what the cut needs.
create function private.distance_m(lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision)
returns double precision language sql immutable security definer set search_path = '' as $$
  select 111320 * sqrt(
    power(lat2 - lat1, 2) + power((lng2 - lng1) * cos(radians((lat1 + lat2) / 2)), 2)
  );
$$;

-- The line without its first and last `metres`; null when nothing is left.
create function private.trim_line_ends(line jsonb, metres double precision)
returns jsonb language plpgsql immutable security definer set search_path = '' as $$
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

-- The last month a piece of point_batch exists for, or null.
create function private.last_piece_month()
returns date language sql stable security definer set search_path = '' as $$
  select max(to_date(substring(c.relname from '^point_batch_(\d{4}_\d{2})$'), 'YYYY_MM'))
  from pg_inherits i
  join pg_class c on c.oid = i.inhrelid
  where i.inhparent = 'public.point_batch'::regclass;
$$;

-- Makes the next n monthly pieces of point_batch after the last one. A month
-- the default piece already holds rows for fails loudly, which is the point.
create function private.add_months(n integer)
returns date language plpgsql security definer set search_path = '' as $$
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

-- Retires one month of raw points (section 6). `min_age_months` is a guard
-- against a typo; the test call passes 0.
create function private.retire_month(target_month date, min_age_months integer default 24)
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

revoke all on function private.distance_m(double precision, double precision, double precision, double precision)
  from public, anon, authenticated;
revoke all on function private.trim_line_ends(jsonb, double precision) from public, anon, authenticated;
revoke all on function private.last_piece_month() from public, anon, authenticated;
revoke all on function private.add_months(integer) from public, anon, authenticated;
revoke all on function private.retire_month(date, integer) from public, anon, authenticated;
