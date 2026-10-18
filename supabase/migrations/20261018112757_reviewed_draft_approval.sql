-- A reviewer approves exactly the draft revision shown on their comparison.
-- Existing 0022 entry points stay unchanged; deployed drafts remain off.
create or replace function public.approve_reviewed_draft(p_draft uuid, p_revision integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
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

-- Explicitly replace the latest approved subject with this draft's contents.
-- This only changes the base: a new submit/review/approve cycle is required.
create or replace function public.refresh_draft_base(p_draft uuid, p_revision integer, p_base_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare d public.draft; live_revision bigint;
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
    select revision into live_revision from public.stop where id = d.subject_id;
  end if;
  if live_revision is null then return jsonb_build_object('code', 'subject_gone'); end if;
  if p_base_revision is null or live_revision <> p_base_revision then
    return jsonb_build_object('code', 'conflict', 'current_revision', live_revision);
  end if;
  update public.draft set base_revision = live_revision, status = 'draft', submitted_at = null
    where id = p_draft returning * into d;
  return jsonb_build_object('code', 'ok', 'draft', row_to_json(d));
exception when deadlock_detected or lock_not_available or query_canceled then
  return jsonb_build_object('code', 'busy');
end $$;
revoke all on function public.approve_reviewed_draft(uuid, integer) from public, anon;
revoke all on function public.refresh_draft_base(uuid, integer, bigint) from public, anon;
grant execute on function public.approve_reviewed_draft(uuid, integer) to authenticated;
grant execute on function public.refresh_draft_base(uuid, integer, bigint) to authenticated;
