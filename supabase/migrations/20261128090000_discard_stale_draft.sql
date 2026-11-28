-- ParaPo — another editor's draft may be discarded once it has gone 7 days
-- without a change.
--
-- Until now only a draft's maker (or anyone, once the maker's account is gone)
-- could discard it: discard_draft answered not_your_draft to anyone else, so a
-- draft an editor walked away from blocked its route or hotspot for good. The
-- owner's decision (2026-11-28): another editor may discard it once it has
-- gone 7 days without a change. An editor's own draft is discarded at any
-- time, as before.
--
-- A draft's last change is draft.updated_at, which the draft_revision trigger
-- sets to now() on every update (a save, a Keep, a take-down's rewrite), so
-- the 7 days count from the server's clock. A younger draft answers
-- {"code": "draft_too_recent", "discardable_from": <timestamptz>}, and nothing
-- is deleted. The check sits after the maker test and before the revision
-- test, so a caller who may not discard yet is never told the revision.
--
-- The 7 days are written in two places that must match: the interval below,
-- and OTHER_EDITOR_DISCARD_DAYS in src/features/studio/data/draft-discard.ts,
-- which decides whether the studio offers Discard at all.
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
  if d.editor_id is not null
     and d.editor_id <> (select auth.uid())
     and d.updated_at + stale_after > now() then
    return jsonb_build_object(
      'code', 'draft_too_recent',
      'discardable_from', d.updated_at + stale_after
    );
  end if;
  if p_revision is not null and d.revision <> p_revision then
    return jsonb_build_object('code', 'revision_mismatch', 'current_revision', d.revision);
  end if;
  delete from public.draft where id = p_draft;
  return jsonb_build_object('code', 'discarded');
end;
$$;
