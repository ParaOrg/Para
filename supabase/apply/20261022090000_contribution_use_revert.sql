-- ParaPo — undo the contribution_use migration. Refuses, changing nothing, while
-- contribution_use has rows (they are the editors' labels) or any contributor
-- is blocked (the unblock function goes with this, so a blocked phone would
-- have no way back). Monthly pieces made by add_months are left: dropping an
-- empty piece is the owner's call. Safe to run twice.
begin;
do $$
begin
  -- Nested: a statement naming a missing table is planned only once the table is known to exist.
  if to_regclass('public.contribution_use') is not null then
    if exists (select 1 from public.contribution_use) then
      raise exception 'contribution_use revert: links are stored, so it is not undone. Nothing was changed.';
    end if;
  end if;
  if to_regclass('public.contributor') is not null then
    if exists (select 1 from public.contributor where blocked_at is not null) then
      raise exception 'contribution_use revert: a contributor is blocked, so it is not undone. Unblock them first. Nothing was changed.';
    end if;
  end if;
end $$;
drop function if exists public.block_contributor(uuid, text);
drop function if exists public.unblock_contributor(uuid);
drop function if exists private.retire_month(date, integer);
drop function if exists private.add_months(integer);
drop function if exists private.trim_line_ends(jsonb, double precision);
drop function if exists private.last_piece_month();
drop function if exists private.distance_m(double precision, double precision, double precision, double precision);
drop table if exists public.contribution_use;
delete from supabase_migrations.schema_migrations where name = 'contribution_use';
commit;
