-- ParaPo — the review operations: claim, submit, send back, approve, discard,
-- take down, put back
--
-- Why: 0018 gave every route and hotspot a status and an aggregate revision,
-- and a draft table one row deep per subject. The studio's saves still reach
-- commuters at the next publish. These functions are the state changes
-- between those: a save becomes a draft (0018), a draft waits pending,
-- approving applies it inside one transaction, and taking a row down or
-- putting it back flips its status.
--
-- All of it is editor-only (private.is_editor(), 0005/0015), security
-- definer: every check below runs against every row whatever the caller's
-- read rules show, and every write bypasses row security after the caller is
-- proven an editor. The caller's id still stamps owner_id/editor_id/takedown
-- rows: auth.uid() reads the request's claims inside a definer function.
--
-- Each returns a jsonb object, never an exception a screen would have to
-- read:
--   { "code": "approved" | "submitted" | ... }            done
--   { "code": "conflict", "current_revision": n }         rebase the draft
--   { "code": "revision_mismatch", "current_revision": n }the draft changed
--   { "code": "no_draft" }                                gone: approved or
--                                                         discarded already
--   { "code": "ends_taken" | "loop_taken" |               a uniqueness or
--             "terminal_place_taken" | "direction_clash" |  guard refusal,
--             "blocked" | "refused" }                     the index's or
--                                                         guard's own name
--   { "code": "bad_payload" }                             not what the studio
--                                                         writes; a bug
--
-- The draft payload (version 1, written by the studio):
--   route:   { "version": 1,
--              "route":      the route's editable columns (signboard, mode,
--                            fare_note, via, head_stop_id, tail_stop_id,
--                            is_loop),
--              "directions": every direction the route is to have, each with
--                            all its columns (id, reversed, control_points,
--                            segments, shape, overview, borrowed_from,
--                            borrowed_part, borrowed_m, signboards,
--                            direction_name, origin_terminal,
--                            destination_terminal, confidence) and "links",
--                            its full route_stop set ([{stop_id,
--                            stop_sequence}]). A direction emptied by the
--                            editor carries shape null and no links. }
--   hotspot: { "version": 1,
--              "stop":       the stop's editable columns (name, informal,
--                            aliases, kind, note, area, point, line),
--              "links":      its full route_stop set ([{route_variant_id,
--                            stop_sequence}]) }
-- A payload is the whole subject, so approving it twice is the same write —
-- and a draft approved against a lost response is safe to re-ask about:
-- the second call finds no draft and answers no_draft.
--
-- Conflict check: a draft holds the subject's revision when it was made
-- (base_revision). Approving compares it with the row's revision now — every
-- content change bumps it (0018: the route's own columns, and each of its
-- directions' — a hotspot's likewise) — under the subject's row lock, so an
-- approval and a take-down of the same row meet in one order, never
-- interleaved.
--
-- Not applied by the session that wrote it: the owner applies it, as
-- postgres, from the SQL editor with the ledger row (README, "Applying a
-- file"), then regenerates the types. Safe to run twice. Verified on a
-- throwaway Postgres (supabase/verify/).
--
-- Reversible:
--   drop function if exists public.approve_draft(uuid);
--   drop function if exists public.claim_draft(text, uuid, boolean, bigint, jsonb, text);
--   drop function if exists public.submit_draft(uuid, integer);
--   drop function if exists public.send_back_draft(uuid, integer, text);
--   drop function if exists public.discard_draft(uuid, integer);
--   drop function if exists public.take_down(text, uuid);
--   drop function if exists public.put_back(text, uuid);
--   drop function if exists private.text_list(jsonb);

create or replace function private.require_editor()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_editor()) then
    raise exception 'An editor is required.'
      using errcode = '42501', constraint = 'editor_required';
  end if;
end;
$$;

-- A payload list read as a text array, empty when absent or not an array.
create or replace function private.text_list(v jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    (select array_agg(e) from jsonb_array_elements_text(case jsonb_typeof(v) when 'array' then v else '[]'::jsonb end) e),
    '{}'::text[]
  );
$$;

-- A link write is content of both its subjects: the direction's route and
-- the stop. 0018 counts row writes only — links were derived from geometry,
-- but terminal links are owner-set through hotspot saves — so a link change
-- must bump both revisions, or a draft's base check would let it be lost.
create or replace function private.link_bumps_subjects()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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

drop trigger if exists route_stop_bumps_subjects on public.route_stop;
create trigger route_stop_bumps_subjects
  after insert or update or delete on public.route_stop
  for each row execute function private.link_bumps_subjects();

-- Map a raised constraint to a refusal code. Guard triggers (0018) carry
-- their names as `constraint` on errcode 23514, the unique indexes theirs on
-- 23505.
create or replace function private.refusal(c text)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
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

-- The draft for a subject, or the one that is already there. claim answers
-- {draft, created}: created is false when another editor's (or an earlier)
-- draft holds the subject, and the studio shows whose it is.
create or replace function public.claim_draft(
  p_kind text,
  p_subject_id uuid,
  p_is_new boolean,
  p_base_revision bigint,
  p_payload jsonb,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.draft;
  made boolean := false;
begin
  perform private.require_editor();
  -- Shape the payload must have before it is stored: version 1, and the
  -- subject's aggregate under its key. Field-level checks happen on approve,
  -- where a wrong cast answers bad_payload instead of raising.
  if (p_payload -> 'version') is distinct from '1'::jsonb
     or (p_kind = 'route' and (jsonb_typeof(p_payload -> 'route') <> 'object'
                             or jsonb_typeof(p_payload -> 'directions') <> 'array'))
     or (p_kind = 'hotspot' and (jsonb_typeof(p_payload -> 'stop') <> 'object'
                               or (p_payload ? 'links' and jsonb_typeof(p_payload -> 'links') <> 'array')))
  then
    return jsonb_build_object('code', 'bad_payload');
  end if;
  if p_kind not in ('route', 'hotspot') then
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

-- draft → pending: the ask for review. revision makes the click conditional:
-- a stale tab that saw an older draft cannot send it pending.
create or replace function public.submit_draft(p_draft uuid, p_revision integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

-- pending → draft, with the note saying why. Any editor may send back
-- (0018: the database is not whose-draft-its rule).
create or replace function public.send_back_draft(p_draft uuid, p_revision integer, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

-- Delete a draft, pending or not. revision is optional: null skips the
-- conditional check (the studio asks before deleting a pending one).
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
  if p_revision is not null and d.revision <> p_revision then
    return jsonb_build_object('code', 'revision_mismatch', 'current_revision', d.revision);
  end if;
  delete from public.draft where id = p_draft;
  return jsonb_build_object('code', 'discarded');
end;
$$;

-- approved → taken_down. The guards answer for themselves: taking down a
-- hotspot that ends an approved route is refused by stop_takedown_guard.
create or replace function public.take_down(p_kind text, p_subject_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c text;
begin
  perform private.require_editor();
  if p_kind = 'route' then
    update public.route set status = 'taken_down' where id = p_subject_id and status = 'approved';
  elsif p_kind = 'hotspot' then
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
end;
$$;

-- taken_down → approved. A new approved row on its place (route_ends_unique,
-- route_loop_unique, stop_terminal_place_unique) or an unapproved end
-- (route_approved_ends) refuses it.
create or replace function public.put_back(p_kind text, p_subject_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c text;
begin
  perform private.require_editor();
  if p_kind = 'route' then
    update public.route set status = 'approved' where id = p_subject_id and status = 'taken_down';
  elsif p_kind = 'hotspot' then
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
end;
$$;

-- The one write that must be atomic: the pending draft's payload becomes the
-- subject, or nothing changes. Everything in it — route or stop, its
-- directions and links, the draft's own removal — is this transaction.
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
  if (d.payload -> 'version') is distinct from '1'::jsonb then
    return jsonb_build_object('code', 'bad_payload');
  end if;

  -- The subject's lock is the conflict check's: a take-down or another
  -- approval of it waits for this transaction, or this for it.
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
    select revision into current_revision from public.route where id = d.subject_id for update;
    if not found then
      return jsonb_build_object('code', 'subject_gone');
    end if;
    if current_revision is distinct from d.base_revision then
      return jsonb_build_object('code', 'conflict', 'current_revision', current_revision);
    end if;
  else
    select revision into current_revision from public.stop where id = d.subject_id for update;
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
    select array_agg((e ->> 'id')::uuid) into dir_ids
    from jsonb_array_elements(d.payload -> 'directions') e;
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

      delete from public.route_stop where route_variant_id = (dir ->> 'id')::uuid;
      insert into public.route_stop (route_variant_id, stop_id, stop_sequence)
      select (dir ->> 'id')::uuid, (l ->> 'stop_id')::uuid, (l ->> 'stop_sequence')::integer
      from jsonb_array_elements(dir -> 'links') l;

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
    if r is null or jsonb_typeof(coalesce(d.payload -> 'links', '[]'::jsonb)) <> 'array' then
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

    delete from public.route_stop where stop_id = d.subject_id;
    insert into public.route_stop (route_variant_id, stop_id, stop_sequence)
    select (l ->> 'route_variant_id')::uuid, d.subject_id, (l ->> 'stop_sequence')::integer
    from jsonb_array_elements(d.payload -> 'links') l;
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
       or invalid_parameter_value or invalid_datetime_format then
    return jsonb_build_object('code', 'bad_payload');
end;
$$;

-- As 0005/0018: a new function is executable by PUBLIC until revoked.
revoke all on function private.require_editor() from public, anon;
revoke all on function private.text_list(jsonb) from public, anon;
revoke all on function private.refusal(text) from public, anon;
revoke all on function public.claim_draft(text, uuid, boolean, bigint, jsonb, text) from public, anon;
revoke all on function public.submit_draft(uuid, integer) from public, anon;
revoke all on function public.send_back_draft(uuid, integer, text) from public, anon;
revoke all on function public.discard_draft(uuid, integer) from public, anon;
revoke all on function public.take_down(text, uuid) from public, anon;
revoke all on function public.put_back(text, uuid) from public, anon;
revoke all on function public.approve_draft(uuid) from public, anon;

grant execute on function private.require_editor() to authenticated;
grant execute on function private.text_list(jsonb) to authenticated;
grant execute on function private.refusal(text) to authenticated;
grant execute on function public.claim_draft(text, uuid, boolean, bigint, jsonb, text) to authenticated;
grant execute on function public.submit_draft(uuid, integer) to authenticated;
grant execute on function public.send_back_draft(uuid, integer, text) to authenticated;
grant execute on function public.discard_draft(uuid, integer) to authenticated;
grant execute on function public.take_down(text, uuid) to authenticated;
grant execute on function public.put_back(text, uuid) to authenticated;
grant execute on function public.approve_draft(uuid) to authenticated;
