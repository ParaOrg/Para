-- ParaPo — apply 20261110190000_retire_review_steps.sql to the live project, in one run.
--
-- APPLY ONLY AFTER MAIN HAS THE NEW STUDIO (save_draft, publish_draft, unpublish): the studio on an
-- older main can no longer save an existing draft or approve one once this is applied.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it once. One transaction: it
-- checks the project first, applies supabase/migrations/20261110190000_retire_review_steps.sql
-- (copied below unchanged), checks the result, and writes the ledger row. If any check fails it
-- raises, and nothing at all is changed, ledger included. A second run stops at step 1 and changes
-- nothing. Afterwards: 20261110190000_retire_review_steps_check.sql. Undo:
-- 20261110190000_retire_review_steps_revert.sql.

begin;

-- 1. Before: draft_published is in the ledger and this has not run.
do $$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'retire_review_steps') then
    raise exception 'retire_review_steps: already applied. Nothing was changed.';
  end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where name = 'draft_published') then
    raise exception 'retire_review_steps: 20261105160000_draft_published is not applied here. Nothing was changed.';
  end if;
end $$;

-- >>> supabase/migrations/20261110190000_retire_review_steps.sql, unchanged
-- ParaPo — retire the review steps the studio no longer has: approval only
-- through publish_draft, a draft's payload only through save_draft.
--
-- APPLY ONLY AFTER MAIN HAS THE NEW STUDIO, the one that saves with
-- save_draft, publishes with publish_draft and unpublishes with unpublish.
-- Staging and production share this database: the studio on an older main
-- updates drafts directly and approves with submit_draft and
-- approve_reviewed_draft, and both stop working the moment this is applied.
--
-- The second half of clean-up step 3 of .scratch/codebase-review/database.md:
-- - approve_draft, approve_reviewed_draft, submit_draft and send_back_draft
--   are dropped. Approval has one way in, publish_draft, always with the
--   revision check (H3). private.apply_draft stays: publish_draft applies
--   through it.
-- - Editors lose the direct update of a draft, and draft_update goes, so a
--   draft's status can no longer be set by hand (M2). save_draft is the way
--   to change a payload; the draft_saver trigger still names who saved it.
--
-- Unchanged: claim_draft, save_draft, publish_draft, unpublish,
-- discard_draft, refresh_draft_base, take_down and put_back. draft.status and
-- submitted_at stay, always 'draft' and null from here on, retired with the
-- rest of the review machinery later (M3).
--
-- Order: after 20261105160000_draft_published (its apply refuses without it).
-- Not applied by the session that wrote it: the owner applies it, as
-- postgres, from supabase/apply/20261110190000_retire_review_steps_apply.sql,
-- then records the ledger version. Safe to run twice. Undo:
-- supabase/apply/20261110190000_retire_review_steps_revert.sql.

drop function if exists public.approve_reviewed_draft(uuid, integer);
drop function if exists public.approve_draft(uuid);
drop function if exists public.submit_draft(uuid, integer);
drop function if exists public.send_back_draft(uuid, integer, text);

revoke update on public.draft from authenticated;
revoke update (payload, status, submitted_at, note) on public.draft from authenticated;
drop policy if exists draft_update on public.draft;
-- <<< supabase/migrations/20261110190000_retire_review_steps.sql

-- 2. After: the four functions gone, no direct update of a draft, the new path whole.
do $$
begin
  if to_regprocedure('public.approve_draft(uuid)') is not null
     or to_regprocedure('public.approve_reviewed_draft(uuid, integer)') is not null
     or to_regprocedure('public.submit_draft(uuid, integer)') is not null
     or to_regprocedure('public.send_back_draft(uuid, integer, text)') is not null then
    raise exception 'retire_review_steps: an old review function is still there. Nothing was changed.';
  end if;
  if has_table_privilege('authenticated', 'public.draft', 'update')
     or has_any_column_privilege('authenticated', 'public.draft', 'update')
     or exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'draft' and policyname = 'draft_update') then
    raise exception 'retire_review_steps: editors can still update a draft directly. Nothing was changed.';
  end if;
  if not has_function_privilege('authenticated', 'public.save_draft(uuid, integer, jsonb)', 'execute')
     or not has_function_privilege('authenticated', 'public.publish_draft(uuid, integer)', 'execute')
     or not has_function_privilege('authenticated', 'public.unpublish(text, uuid)', 'execute')
     or to_regprocedure('private.apply_draft(uuid)') is null then
    raise exception 'retire_review_steps: save_draft, publish_draft or unpublish is not whole. Nothing was changed.';
  end if;
end $$;

-- 3. The ledger row, once.
insert into supabase_migrations.schema_migrations (version, name, statements)
select greatest(to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
                (select (max(version)::bigint + 1)::text from supabase_migrations.schema_migrations
                 where version ~ '^[0-9]{14}$')),
       'retire_review_steps', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'retire_review_steps');

commit;
