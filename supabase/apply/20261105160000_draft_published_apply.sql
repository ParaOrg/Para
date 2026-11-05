-- ParaPo — apply 20261105160000_draft_published.sql to the live project, in one run.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it once.
-- One transaction: it checks the project first, applies
-- supabase/migrations/20261105160000_draft_published.sql (copied below
-- unchanged), checks the result, and writes the ledger row. If any check fails
-- it raises, and nothing at all is changed, ledger included. A second run stops
-- at step 1 and changes nothing. Afterwards:
-- 20261105160000_draft_published_check.sql (it adds test editors, places and a
-- route, and rolls them back). Undo: 20261105160000_draft_published_revert.sql.
--
-- Safe to apply now: production keeps working. The studio on main (direct
-- draft updates, submit_draft and approve_reviewed_draft) keeps every grant it
-- uses, and its saves and approvals stamp the new columns too.

begin;

-- 1. Before: draft_update_makerless is in the ledger and this has not run.
do $$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'draft_published') then
    raise exception 'draft_published: already applied. Nothing was changed.';
  end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where name = 'draft_update_makerless') then
    raise exception 'draft_published: 20261105130000_draft_update_makerless is not applied here. Nothing was changed.';
  end if;
end $$;

-- >>> supabase/migrations/20261105160000_draft_published.sql, unchanged
-- ParaPo — Draft and Published: a draft is published in one step, unpublished
-- work is left a draft, and the route and hotspot rows say who last saved them
-- and when they were published.
--
-- The owner's decision of 2026-11-05 (docs/adr/0003, amendment; CONTEXT.md,
-- "Draft / Published"): two states, Draft and Published, for routes and
-- hotspots alike. Publish approves a draft at once, with no Pending step and no
-- Send back; Unpublish takes published work off the public map at the next
-- publish and leaves it a draft. The studio shows, for each route and hotspot,
-- its Author (who last saved it), Date published and Last edited. Clean-up
-- step 3 of .scratch/codebase-review/database.md, closing H3 and M2.
--
-- 1. route and stop gain published_at, published_by, last_saved_at and
--    last_saved_by. Publishing writes all four. Existing rows are backfilled
--    from status_at and owner_id. That is APPROXIMATE: status_at is when the
--    row was first approved or last taken down or put back (or when 0018 was
--    applied, for older rows), and owner_id is whoever first created or
--    approved it. A taken-down row gets no published_at or published_by. The
--    backfill moves no revision and no updated_at: it is no change to a
--    route or hotspot, so no draft's base goes stale.
--    published_by names the draft's maker, not the editor who pressed
--    Publish; a maker-less draft names the publisher.
--
-- 2. draft gains last_saved_by: claim_draft's insert sets it through its
--    default, and the draft_saver trigger sets it whenever a draft's payload
--    changes, by save_draft or by the direct update the studio on main still
--    makes. A draft's updated_at is when it was last saved. Publishing copies
--    both onto the row.
--
-- 3. save_draft(draft, revision, payload) changes a draft's payload: the
--    maker's own draft or a maker-less one, at the revision the editor read,
--    with a payload of the v1 shape. It takes the draft out of review, as the
--    direct update does.
--
-- 4. publish_draft(draft, revision) publishes straight from a draft: the
--    revision the editor saw, then the draft applied by private.apply_draft,
--    approve_draft's body without its pending check: the base_revision
--    conflict check, the lock order (draft, then routes, then hotspots), the
--    end guards and the unique places. approve_draft becomes its pending
--    check and a call to private.apply_draft, so the old path stamps the
--    published columns too: one body that applies a draft.
--
-- 5. unpublish(kind, id) is take_down, keeping the hotspot-ends-a-route
--    guard, and it leaves a draft. Without a draft, a draft of the row as it
--    stands is made, held by the editor who unpublished it, carrying the row's
--    own last save (Author and Last edited do not change), and based on its new
--    revision, so publishing it puts the row back unchanged. An existing draft
--    is left, and rebased onto the new revision when it was based on the one
--    the take-down replaced (the take-down changes no content).
--
-- 6. SAFE TO APPLY NOW: production keeps working. Staging and production
--    share this database, and the studio on main still saves a draft by
--    direct update and approves with submit_draft and approve_reviewed_draft.
--    All of that stays, granted as before, and stamps the new columns too.
--    Retiring it (dropping approve_draft, approve_reviewed_draft, submit_draft
--    and send_back_draft, revoking the direct update: H3 and M2) is the
--    follow-up 20261105170000_retire_review_steps, applied only once main
--    has the studio that uses save_draft, publish_draft and unpublish.
--
-- Order: after 20261105130000_draft_update_makerless (its apply refuses
-- without it). Not applied by the session that wrote it: the owner applies
-- it, as postgres, from supabase/apply/20261105160000_draft_published_apply.sql,
-- then records the ledger version. Safe to run twice. Undo:
-- supabase/apply/20261105160000_draft_published_revert.sql.

-- 1. Who last saved a route or hotspot and when, and when it was published.
alter table public.route
  add column if not exists published_at timestamptz,
  add column if not exists published_by uuid references auth.users (id) on delete set null,
  add column if not exists last_saved_at timestamptz,
  add column if not exists last_saved_by uuid references auth.users (id) on delete set null;
alter table public.stop
  add column if not exists published_at timestamptz,
  add column if not exists published_by uuid references auth.users (id) on delete set null,
  add column if not exists last_saved_at timestamptz,
  add column if not exists last_saved_by uuid references auth.users (id) on delete set null;
create index if not exists route_published_by_idx on public.route (published_by) where published_by is not null;
create index if not exists route_last_saved_by_idx on public.route (last_saved_by) where last_saved_by is not null;
create index if not exists stop_published_by_idx on public.stop (published_by) where published_by is not null;
create index if not exists stop_last_saved_by_idx on public.stop (last_saved_by) where last_saved_by is not null;

comment on column public.route.published_at is 'When the route was last published. Approximate (status_at) for rows published before 20261105160000.';
comment on column public.route.published_by is 'The maker of the draft last published. Approximate (owner_id) before 20261105160000.';
comment on column public.route.last_saved_at is 'When the draft last published was last saved. Approximate (status_at) before 20261105160000.';
comment on column public.route.last_saved_by is 'Who last saved the draft last published. Approximate (owner_id) before 20261105160000.';
comment on column public.stop.published_at is 'When the hotspot was last published. Approximate (status_at) for rows published before 20261105160000.';
comment on column public.stop.published_by is 'The maker of the draft last published. Approximate (owner_id) before 20261105160000.';
comment on column public.stop.last_saved_at is 'When the draft last published was last saved. Approximate (status_at) before 20261105160000.';
comment on column public.stop.last_saved_by is 'Who last saved the draft last published. Approximate (owner_id) before 20261105160000.';

-- The backfill, once: only rows nothing has stamped yet. It is no change to
-- a route or hotspot, so the revision and updated_at triggers are held off
-- for it: no draft's base goes stale, and the studio's newest-first order
-- stays as it was.
alter table public.route disable trigger route_revision, disable trigger route_touch;
alter table public.stop disable trigger stop_revision, disable trigger stop_touch;
update public.route set
  published_at = case when status = 'approved' then status_at end,
  published_by = case when status = 'approved' then owner_id end,
  last_saved_at = status_at,
  last_saved_by = owner_id
where last_saved_at is null;
update public.stop set
  published_at = case when status = 'approved' then status_at end,
  published_by = case when status = 'approved' then owner_id end,
  last_saved_at = status_at,
  last_saved_by = owner_id
where last_saved_at is null;
alter table public.route enable trigger route_revision, enable trigger route_touch;
alter table public.stop enable trigger stop_revision, enable trigger stop_touch;

-- 2. Who last saved a draft.
alter table public.draft
  add column if not exists last_saved_by uuid default auth.uid() references auth.users (id) on delete set null;
create index if not exists draft_last_saved_by_idx on public.draft (last_saved_by) where last_saved_by is not null;
-- Before this, a draft was saved only by its maker.
alter table public.draft disable trigger draft_revision;
update public.draft set last_saved_by = editor_id where last_saved_by is null and editor_id is not null;
alter table public.draft enable trigger draft_revision;

-- 3. save_draft: a draft's payload replaced, at the revision the editor read.
create or replace function public.save_draft(p_draft uuid, p_revision integer, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

-- Who saved a draft last, however its payload was changed.
create or replace function private.draft_saver()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.payload is distinct from old.payload then
    new.last_saved_by := coalesce((select auth.uid()), new.last_saved_by);
  end if;
  return new;
end;
$$;
create or replace trigger draft_saver before update on public.draft
  for each row execute function private.draft_saver();
revoke all on function private.draft_saver() from public, anon, authenticated;

-- 4. publish_draft: the revision the editor saw, then the draft applied.
-- approve_draft's body as 20261105120000_review_rules left it, without the
-- pending check, writing the published and last-saved columns. Called by
-- publish_draft alone; never granted.
create or replace function private.apply_draft(p_draft uuid)
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

create or replace function public.publish_draft(p_draft uuid, p_revision integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

-- 5. unpublish: taken down, and left a draft.
-- A route's or hotspot's whole state as a draft's payload v1, as the studio
-- builds it (studio/data/drafts.ts): what publishing it again would write.
create or replace function private.payload_of(p_kind text, p_subject_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
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

create or replace function public.unpublish(p_kind text, p_subject_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

-- 6. approve_draft: its pending check, then the one body that applies a draft.
-- approve_reviewed_draft, submit_draft and send_back_draft are unchanged.
create or replace function public.approve_draft(p_draft uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

revoke all on function private.apply_draft(uuid) from public, anon, authenticated;
revoke all on function private.payload_of(text, uuid) from public, anon, authenticated;
revoke all on function public.save_draft(uuid, integer, jsonb) from public, anon;
revoke all on function public.publish_draft(uuid, integer) from public, anon;
revoke all on function public.unpublish(text, uuid) from public, anon;
grant execute on function public.save_draft(uuid, integer, jsonb) to authenticated;
grant execute on function public.publish_draft(uuid, integer) to authenticated;
grant execute on function public.unpublish(text, uuid) to authenticated;
-- <<< supabase/migrations/20261105160000_draft_published.sql

-- 2. After: the columns, filled; the three functions, an editor's only; the
--    studio on main's path still granted.
do $$
begin
  if exists (select 1 from public.route where last_saved_at is null)
     or exists (select 1 from public.stop where last_saved_at is null)
     or exists (select 1 from public.route where status = 'approved' and published_at is null)
     or exists (select 1 from public.stop where status = 'approved' and published_at is null) then
    raise exception 'draft_published: a row was left without its last save or its publish date. Nothing was changed.';
  end if;
  if to_regprocedure('public.save_draft(uuid, integer, jsonb)') is null
     or to_regprocedure('public.publish_draft(uuid, integer)') is null
     or to_regprocedure('public.unpublish(text, uuid)') is null
     or not has_function_privilege('authenticated', 'public.save_draft(uuid, integer, jsonb)', 'execute')
     or not has_function_privilege('authenticated', 'public.publish_draft(uuid, integer)', 'execute')
     or not has_function_privilege('authenticated', 'public.unpublish(text, uuid)', 'execute')
     or has_function_privilege('anon', 'public.publish_draft(uuid, integer)', 'execute')
     or has_function_privilege('anon', 'public.unpublish(text, uuid)', 'execute')
     or has_function_privilege('anon', 'public.save_draft(uuid, integer, jsonb)', 'execute')
     or has_function_privilege('authenticated', 'private.apply_draft(uuid)', 'execute')
     or has_function_privilege('authenticated', 'private.payload_of(text, uuid)', 'execute') then
    raise exception 'draft_published: save_draft, publish_draft or unpublish is missing or granted wrongly. Nothing was changed.';
  end if;
  if not has_function_privilege('authenticated', 'public.approve_draft(uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.approve_reviewed_draft(uuid, integer)', 'execute')
     or not has_function_privilege('authenticated', 'public.submit_draft(uuid, integer)', 'execute')
     or not has_function_privilege('authenticated', 'public.send_back_draft(uuid, integer, text)', 'execute')
     or not has_column_privilege('authenticated', 'public.draft', 'payload', 'update')
     or not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'draft' and policyname = 'draft_update') then
    raise exception 'draft_published: the studio on main lost a grant it uses. Nothing was changed.';
  end if;
end $$;

-- 3. The ledger row, once.
insert into supabase_migrations.schema_migrations (version, name, statements)
select greatest(to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
                (select (max(version)::bigint + 1)::text from supabase_migrations.schema_migrations
                 where version ~ '^[0-9]{14}$')),
       'draft_published', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'draft_published');

commit;
