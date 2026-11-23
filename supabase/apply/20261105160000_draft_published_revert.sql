-- ParaPo — undo draft_published: approve_draft as 20261105120000_review_rules has it, and the
-- published and last-saved columns gone.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it. One transaction; safe to
-- run twice. It drops save_draft, publish_draft, unpublish, private.apply_draft,
-- private.payload_of and the draft_saver trigger; re-creates approve_draft's own body (as
-- 20261105120000_review_rules has it); and drops draft.last_saved_by and the four columns on route
-- and stop. What those columns recorded since the apply is lost. The drafts unpublish left stay:
-- they are ordinary drafts, and the row it took down stays taken down. Then the ledger row goes.
-- Apply 20261105170000_retire_review_steps's revert first if that was applied.
begin;

drop function if exists public.unpublish(text, uuid);
drop function if exists public.publish_draft(uuid, integer);
drop function if exists public.save_draft(uuid, integer, jsonb);
drop function if exists private.payload_of(text, uuid);
drop trigger if exists draft_saver on public.draft;
drop function if exists private.draft_saver();

-- As 20261105120000_review_rules.
create or replace function public.approve_draft(p_draft uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
  if not private.payload_ok(d.kind, d.payload) then
    return jsonb_build_object('code', 'bad_payload');
  end if;

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
      insert into public.route (id, owner_id, signboard, mode, fare_note, via, head_stop_id, tail_stop_id, is_loop, status)
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
        'approved'
      );
    else
      update public.route set
        signboard = r ->> 'signboard',
        mode = (r ->> 'mode')::public.transport_mode,
        fare_note = r ->> 'fare_note',
        via = r ->> 'via',
        head_stop_id = case when (r ->> 'is_loop')::boolean then null else (r ->> 'head_stop_id')::uuid end,
        tail_stop_id = case when (r ->> 'is_loop')::boolean then null else (r ->> 'tail_stop_id')::uuid end,
        status = 'approved'
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
      insert into public.stop (id, owner_id, name, point, kind, area, note, informal, aliases, line, status)
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
        'approved'
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
        status = 'approved'
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

drop function if exists private.apply_draft(uuid);

drop index if exists public.draft_last_saved_by_idx;
alter table public.draft drop column if exists last_saved_by;
drop index if exists public.route_published_by_idx;
drop index if exists public.route_last_saved_by_idx;
drop index if exists public.stop_published_by_idx;
drop index if exists public.stop_last_saved_by_idx;
alter table public.route
  drop column if exists published_at,
  drop column if exists published_by,
  drop column if exists last_saved_at,
  drop column if exists last_saved_by;
alter table public.stop
  drop column if exists published_at,
  drop column if exists published_by,
  drop column if exists last_saved_at,
  drop column if exists last_saved_by;

delete from supabase_migrations.schema_migrations where name = 'draft_published';
commit;
