-- Para undoes longer_contributions and puts the 6 hour length check back. It refuses, changing
-- nothing, while a kept ride is longer than 6 hours, because the old check would refuse that row.
-- Hide or delete those rides first. It is one transaction and safe to run twice.
begin;
do $$
begin
  if exists (select 1 from public.contribution where ended_at > started_at + interval '6 hours') then
    raise exception 'longer_contributions: a kept ride is longer than 6 hours. Nothing was changed.';
  end if;
end $$;
alter table public.contribution drop constraint if exists contribution_check;
alter table public.contribution add constraint contribution_check
  check (ended_at > started_at and ended_at <= started_at + interval '6 hours');
delete from supabase_migrations.schema_migrations where name = 'longer_contributions';
commit;
