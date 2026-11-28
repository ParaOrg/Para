-- ParaPo — undo 20261128090000_discard_stale_draft: discard_draft is as
-- 20261105120000_review_rules wrote it again, so only a draft's maker (or
-- anyone, once the maker is gone) discards it. The definition below is copied
-- unchanged from that migration. Touches no data and no grant. Safe to run twice.
begin;

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

delete from supabase_migrations.schema_migrations where name = 'discard_stale_draft';
commit;
