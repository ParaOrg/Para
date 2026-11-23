-- ParaPo — undo retire_review_steps: the studio on an older main's path comes back as
-- 20261105160000_draft_published left it: approve_draft (its pending check, then
-- private.apply_draft), approve_reviewed_draft, submit_draft and send_back_draft with their grants,
-- and the direct update of a draft's payload, status, submitted_at and note under draft_update (the
-- maker's, or a maker-less draft's). Touches no data. One transaction; safe to run twice.
begin;

-- As 0022_draft_ops.
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

-- As 20261105160000_draft_published.
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

-- As 20261018112757_reviewed_draft_approval.
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

revoke all on function public.submit_draft(uuid, integer) from public, anon;
revoke all on function public.send_back_draft(uuid, integer, text) from public, anon;
revoke all on function public.approve_draft(uuid) from public, anon;
revoke all on function public.approve_reviewed_draft(uuid, integer) from public, anon;
grant execute on function public.submit_draft(uuid, integer) to authenticated;
grant execute on function public.send_back_draft(uuid, integer, text) to authenticated;
grant execute on function public.approve_draft(uuid) to authenticated;
grant execute on function public.approve_reviewed_draft(uuid, integer) to authenticated;

-- As 20261105120000_review_rules and 20261105130000_draft_update_makerless.
grant update (payload, status, submitted_at, note) on public.draft to authenticated;
drop policy if exists draft_update on public.draft;
create policy draft_update on public.draft for update to authenticated
  using (
    (select private.is_editor())
    and (editor_id = (select auth.uid()) or editor_id is null)
  )
  with check (
    (select private.is_editor())
    and (editor_id = (select auth.uid()) or editor_id is null)
  );

delete from supabase_migrations.schema_migrations where name = 'retire_review_steps';
commit;
