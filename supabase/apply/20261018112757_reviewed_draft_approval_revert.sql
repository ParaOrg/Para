-- Recovery for the new review entry points only. No subject or draft data changes.
begin;
drop function if exists public.approve_reviewed_draft(uuid, integer);
drop function if exists public.refresh_draft_base(uuid, integer, bigint);
delete from supabase_migrations.schema_migrations where name = 'reviewed_draft_approval';
commit;
