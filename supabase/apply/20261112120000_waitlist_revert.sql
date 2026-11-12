-- Para — undo waitlist: drops the list and its ledger row. Refuses, changing nothing, while the
-- list holds an email: export or delete the rows first, since a drop cannot be taken back. One
-- transaction; safe to run twice.
begin;
do $$
begin
  if to_regclass('public.waitlist') is null then return; end if;
  if exists (select 1 from public.waitlist) then
    raise exception 'waitlist: the list holds emails. Nothing was changed.';
  end if;
end $$;
drop table if exists public.waitlist;
delete from supabase_migrations.schema_migrations where name = 'waitlist';
commit;
