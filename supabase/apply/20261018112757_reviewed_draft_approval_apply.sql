-- ParaPo — apply 20261018112757_reviewed_draft_approval.sql to the live project, in one run.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it once.
-- One transaction: it checks 0022 is applied, applies the migration (copied
-- below unchanged), checks the result and writes the ledger row. Any failed
-- check raises and nothing is changed. Safe to run twice: both functions are
-- `create or replace`, and the ledger row is written once.
-- Afterwards: 20261018112757_reviewed_draft_approval_check.sql (read-only).
-- Undo: 20261018112757_reviewed_draft_approval_revert.sql.
--
-- Adds two functions only. No table, row or existing function changes, and
-- nothing calls them until the studio's drafts are turned on (STUDIO_DRAFTS).

begin;

-- 1. Before: 0022's review operations exist, which these build on.
do $$
begin
  if not exists (select 1 from supabase_migrations.schema_migrations where name = '0022_draft_ops')
     or to_regprocedure('public.approve_draft(uuid)') is null
     or to_regprocedure('private.lock_rows(uuid[], uuid[])') is null then
    raise exception 'reviewed_draft_approval: 0022_draft_ops is not applied here. Nothing was changed.';
  end if;
end $$;

-- >>> supabase/migrations/20261018112757_reviewed_draft_approval.sql, unchanged
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
-- <<< supabase/migrations/20261018112757_reviewed_draft_approval.sql

-- 2. After: both are definers with a pinned path, run by signed-in users only.
do $$
declare bad text;
begin
  select string_agg(p.oid::regprocedure::text, ', ') into bad
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('approve_reviewed_draft', 'refresh_draft_base')
    and (not p.prosecdef or not coalesce(p.proconfig @> array['search_path=""'], false)
         or has_function_privilege('anon', p.oid, 'execute')
         or has_function_privilege('public', p.oid, 'execute')
         or not has_function_privilege('authenticated', p.oid, 'execute'));
  if bad is not null then
    raise exception 'reviewed_draft_approval: wrong security on %. Nothing was changed.', bad;
  end if;
  if to_regprocedure('public.approve_reviewed_draft(uuid, integer)') is null
     or to_regprocedure('public.refresh_draft_base(uuid, integer, bigint)') is null then
    raise exception 'reviewed_draft_approval: a function is missing. Nothing was changed.';
  end if;
end $$;

-- 3. The ledger row, once.
insert into supabase_migrations.schema_migrations (version, name, statements)
select greatest(to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
                (select (max(version)::bigint + 1)::text from supabase_migrations.schema_migrations
                 where version ~ '^[0-9]{14}$')),
       'reviewed_draft_approval', '{}'
where not exists (
  select 1 from supabase_migrations.schema_migrations where name = 'reviewed_draft_approval'
);

commit;
