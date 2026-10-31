-- ParaPo — undo the delete_my_account migration: drops the function, puts
-- private.contribution_hide_stamp back as 20261019125900_contributions made it,
-- and removes the ledger row. Accounts already deleted stay deleted. Safe to
-- run twice.
begin;
drop function if exists public.delete_my_account();
create or replace function private.contribution_hide_stamp()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.hidden_at is null then
    new.hidden_by := null;
    new.hidden_note := null;
  elsif old.hidden_at is null then
    new.hidden_at := now();
    new.hidden_by := (select auth.uid());
  else
    new.hidden_at := old.hidden_at;
    new.hidden_by := old.hidden_by;
  end if;
  return new;
end $$;
delete from supabase_migrations.schema_migrations where name = 'delete_my_account';
commit;
