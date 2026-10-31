-- ParaPo — undo the delete_my_account migration: drops the function and its
-- ledger row. Accounts already deleted stay deleted. Safe to run twice.
begin;
drop function if exists public.delete_my_account();
delete from supabase_migrations.schema_migrations where name = 'delete_my_account';
commit;
