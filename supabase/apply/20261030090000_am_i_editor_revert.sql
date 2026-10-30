-- ParaPo — undo am_i_editor: the function goes. The studio then cannot tell
-- and lets every account in, as before (it warns in the console). Touches no
-- data. Safe to run twice.
begin;
drop function if exists public.am_i_editor();
delete from supabase_migrations.schema_migrations where name = 'am_i_editor';
commit;
