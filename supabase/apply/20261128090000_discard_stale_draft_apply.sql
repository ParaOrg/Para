-- ParaPo — apply 20261128090000_discard_stale_draft.sql to the live project, in one run.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it once.
-- One transaction: it checks the project first, applies
-- supabase/migrations/20261128090000_discard_stale_draft.sql (copied below
-- unchanged), checks the result, and writes the ledger row. If any check fails
-- it raises, and nothing at all is changed, ledger included. A second run stops
-- at step 1 and changes nothing. Afterwards:
-- 20261128090000_discard_stale_draft_check.sql (it adds test editors and drafts and rolls
-- them back). Undo: 20261128090000_discard_stale_draft_revert.sql.
--
-- Replaces one function (discard_draft, same signature, same grants); no
-- table, policy or row changes.

begin;

-- 1. Before: review_rules is in the ledger and this has not run.
do $$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'discard_stale_draft') then
    raise exception 'discard_stale_draft: already applied. Nothing was changed.';
  end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where name = 'review_rules') then
    raise exception 'discard_stale_draft: 20261105120000_review_rules is not applied here. Nothing was changed.';
  end if;
end $$;

-- >>> supabase/migrations/20261128090000_discard_stale_draft.sql, unchanged
-- ParaPo — another editor's draft may be discarded once it has gone 7 days
-- without a change.
--
-- discard_draft answered not_your_draft to anyone but a draft's maker, so a
-- draft an editor walked away from blocked its route or hotspot for good. Now
-- another editor may discard it once it has gone 7 days without a change. A
-- maker-less draft stays anyone's, and a draft's own maker discards it at any
-- time.
--
-- A draft's last change is the later of draft.updated_at, which the
-- draft_revision trigger sets to now() on every update (a save, a Keep), and
-- draft.created_at: a draft made by unpublishing or taking down carries the
-- row's old last-save time in updated_at, but it is new work. Both are
-- clamped to now(), so a stamp set in the future by a direct insert (editors
-- may insert their own drafts) cannot make a draft undiscardable. A younger
-- draft answers {"code": "draft_too_recent", "discardable_from": <timestamptz>}
-- and nothing is deleted. The check sits after the maker test and before the
-- revision test, so a caller who may not discard yet is never told the
-- revision.
--
-- The 7 days are written in two places that must match: the interval below,
-- and OTHER_EDITOR_DISCARD_DAYS in src/features/studio/data/draft-discard.ts,
-- which decides whether the studio offers Discard at all
-- (tests/unit/draft-discard-test.mjs compares them).
--
-- Same signature, so the grants stay as 0022_draft_ops set them (authenticated
-- only, not anon or PUBLIC); the function stays a security definer with its
-- search_path pinned, and every name in it is schema-qualified. No table,
-- policy or row changes.
--
-- Order: after 20261105120000_review_rules, which wrote the function this
-- replaces (its apply refuses without it).
-- Not applied by the session that wrote it: the owner applies it, as
-- postgres, from supabase/apply/20261128090000_discard_stale_draft_apply.sql,
-- then records the ledger version. Safe to run twice. Undo:
-- supabase/apply/20261128090000_discard_stale_draft_revert.sql.

create or replace function public.discard_draft(p_draft uuid, p_revision integer default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.draft;
  last_change timestamptz;
  -- Must match OTHER_EDITOR_DISCARD_DAYS in the studio.
  stale_after constant interval := interval '7 days';
begin
  perform private.require_editor();
  -- FOR UPDATE: a concurrent save must land before our revision read, or
  -- wait for the delete — never be read stale and still deleted.
  select * into d from public.draft where id = p_draft for update;
  if not found then
    return jsonb_build_object('code', 'no_draft');
  end if;
  -- Another editor's draft (a maker-less one belongs to nobody): only once it
  -- has gone the whole interval without a change.
  last_change := greatest(least(d.updated_at, now()), least(d.created_at, now()));
  if d.editor_id is not null
     and d.editor_id is distinct from (select auth.uid())
     and last_change + stale_after > now() then
    return jsonb_build_object(
      'code', 'draft_too_recent',
      'discardable_from', last_change + stale_after
    );
  end if;
  if p_revision is not null and d.revision <> p_revision then
    return jsonb_build_object('code', 'revision_mismatch', 'current_revision', d.revision);
  end if;
  delete from public.draft where id = p_draft;
  return jsonb_build_object('code', 'discarded');
end;
$$;
-- <<< supabase/migrations/20261128090000_discard_stale_draft.sql

-- 2. After: still a definer with a pinned path, for authenticated only, and it
--    answers draft_too_recent before it deletes.
do $$
begin
  if not exists (
    select 1 from pg_proc
    where oid = 'public.discard_draft(uuid, integer)'::regprocedure
      and prosecdef and proconfig @> array['search_path=""']
      and position('draft_too_recent' in prosrc) > 0
      and position('draft_too_recent' in prosrc) < position('delete from public.draft' in prosrc)
  ) then
    raise exception 'discard_stale_draft: discard_draft is not the new definition. Nothing was changed.';
  end if;
  if not has_function_privilege('authenticated', 'public.discard_draft(uuid, integer)', 'execute')
     or has_function_privilege('anon', 'public.discard_draft(uuid, integer)', 'execute')
     or has_function_privilege('public', 'public.discard_draft(uuid, integer)', 'execute') then
    raise exception 'discard_stale_draft: discard_draft''s grants changed. Nothing was changed.';
  end if;
end $$;

-- 3. The ledger row, once.
insert into supabase_migrations.schema_migrations (version, name, statements)
select greatest(to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
                (select (max(version)::bigint + 1)::text from supabase_migrations.schema_migrations
                 where version ~ '^[0-9]{14}$')),
       'discard_stale_draft', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'discard_stale_draft');

commit;
