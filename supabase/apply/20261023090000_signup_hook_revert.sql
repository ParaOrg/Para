-- ParaPo — undo the signup_hook migration. Touches no data. First remove the
-- Before User Created hook in the dashboard (Authentication, Hooks) and turn
-- "Allow new users to sign up" off: with the hook still selected and the
-- function gone, every sign-up fails. Safe to run twice.
begin;
drop function if exists private.before_user_created(jsonb);
revoke usage on schema private from supabase_auth_admin;
delete from supabase_migrations.schema_migrations where name = 'signup_hook';
commit;
