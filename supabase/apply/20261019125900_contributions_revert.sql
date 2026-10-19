-- ParaPo — undo the contributions migration. Refuses while any contribution is
-- stored: it would delete phones' recordings. Route data is never touched.
begin;
do $$
begin
  -- Two steps: the second is planned only once the table is known to exist.
  if to_regclass('public.contribution') is null then return; end if;
  if exists (select 1 from public.contribution) then
    raise exception 'contributions revert: contributions are stored, so it is not undone. Nothing was changed.';
  end if;
end $$;
drop function if exists public.save_contribution(jsonb);
drop table if exists public.hinto, public.point_batch, public.contribution, public.contributor;
drop function if exists private.can_contribute();
drop function if exists private.contributor_stamp();
drop function if exists private.contribution_stamp();
drop function if exists private.point_batch_stamp();
drop function if exists private.hinto_cap();
drop function if exists private.contribution_hide_stamp();
delete from supabase_migrations.schema_migrations where name = 'contributions';
commit;
