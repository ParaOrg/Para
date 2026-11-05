-- ParaPo — undo keep_uploads_on_user_delete: deleting a user (anywhere but delete_my_account)
-- cascades their rides away again, as before. Touches no data. One transaction; safe to run twice.
begin;
drop trigger if exists contributor_unlink_contributions on public.contributor;
drop function if exists private.unlink_contributions();
delete from supabase_migrations.schema_migrations where name = 'keep_uploads_on_user_delete';
commit;
