-- ParaPo — the review step's rules: approvals write only the links that
-- changed, a kept hotspot draft takes the approved directions' links, an
-- editor changes only a draft's content, and only its maker discards it.
--
-- Findings studio-03, studio-08 and studio-09 (.scratch/codebase-review/studio.md).
-- The studio's spec has the rule for discarding (.scratch/studio-ux/spec.md,
-- "Decisions so far": only a draft's maker, never another editor, with no
-- 7-day rule).
--
-- 1. approve_draft (0022) writes a link only when it differs. It used to
--    delete and re-insert every link of the subject, and every link write
--    bumps both its route's and its hotspot's revision (0022's
--    route_stop_bumps_subjects). So approving a fare note on route R moved the
--    revision of every hotspot R passes, and every draft of those hotspots
--    answered "conflict" though nothing about them had changed; approving a
--    hotspot did the same to every route through it. Now a link the payload
--    keeps as it is, same direction, hotspot and sequence, is not touched;
--    the ones the payload drops are deleted and the new ones inserted. The
--    payload is still the whole link set, so the result is the same rows as
--    before, with the same codes: a hotspot (or direction) listed twice is
--    still refused, as the primary key refused it.
--
-- 2. refresh_draft_base (20261018112757), the studio's "Keep draft for a new
--    review", rebuilds a hotspot draft's links instead of keeping the list
--    frozen when the draft was made. A hintuan's links are computed from the
--    directions that pass it; a terminal's are the directions an editor
--    ticked, plus the ikot that pass it (studio/data/hotspots-geometry.ts).
--    The computed links are taken from what the approved directions link to
--    the hotspot now, which the studio computed with the same rule when each
--    direction was approved. The ticked terminal links are kept from the
--    draft. Without this, keeping a draft after another editor's approval
--    added a route through the hotspot dropped that link on approval.
--    The approved directions' links were computed against the approved
--    outline, so they are used only when the draft keeps the approved
--    outline (area) and station line. A draft that moves the outline or the
--    line keeps its own list, as before: its links need the studio's
--    geometry, which recomputes them at the draft's next edit.
--    Route drafts are kept as before.
--
-- 3. Editors change only a draft's content directly: update on payload,
--    status, submitted_at and note, instead of every column (0018). Its
--    base_revision, editor_id, subject_id, kind and is_new are the review
--    functions' to set. draft_update's with check no longer accepts
--    editor_id null, so a direct update can never leave a draft without its
--    maker.
--
-- 4. Only a draft's maker discards it. discard_draft answers
--    {"code": "not_your_draft"} for another editor's draft, and draft_delete
--    allows a direct delete by the maker only. A draft whose maker's account
--    is gone (editor_id null, set null on delete) can be discarded by any
--    editor through discard_draft, so it never gets stuck.
--
-- Unchanged: claim, submit, send back, approve_reviewed_draft, take down and
-- put back; who may approve or send back (every editor); the codes, apart
-- from the new not_your_draft.
--
-- Order: after 0022_draft_ops, 20261018112757_reviewed_draft_approval and
-- 20261026090000_draft_update_own (its apply refuses without them).
-- Not applied by the session that wrote it: the owner applies it, as
-- postgres, from supabase/apply/20261105120000_review_rules_apply.sql, then
-- records the ledger version. Safe to run twice. Undo:
-- supabase/apply/20261105120000_review_rules_revert.sql.

-- 1. Approval writes only the links that changed.
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

-- 2. Keep rebuilds a hotspot draft's links from the approved directions.
create or replace function public.refresh_draft_base(p_draft uuid, p_revision integer, p_base_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
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

-- 4. Only the maker discards a draft, or anyone once the maker is gone.
create or replace function public.discard_draft(p_draft uuid, p_revision integer default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

-- 3 and 4. The table: content columns only, the maker's own.
revoke update on public.draft from authenticated;
grant update (payload, status, submitted_at, note) on public.draft to authenticated;

drop policy if exists draft_update on public.draft;
create policy draft_update on public.draft for update to authenticated
  using (
    (select private.is_editor())
    and (editor_id = (select auth.uid()) or editor_id is null)
  )
  with check (
    (select private.is_editor())
    and editor_id = (select auth.uid())
  );

drop policy if exists draft_delete on public.draft;
create policy draft_delete on public.draft for delete to authenticated
  using (
    (select private.is_editor())
    and editor_id = (select auth.uid())
  );
