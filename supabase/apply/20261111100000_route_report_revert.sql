-- ParaPo — undo route_report: the table and every report in it, the function, the schema report,
-- the trigger and the role report_sender go. The reports are lost; export them first if they are
-- wanted (select * from public.route_report). One transaction; safe to run twice. Stop the
-- Worker first: once this runs, every report it sends fails.
begin;
drop function if exists report.submit_route_report(uuid, uuid, text, text);
drop schema if exists report;
drop table if exists public.route_report;
drop function if exists private.route_report_resolved();
-- Its grants went with the schema and the function, so nothing holds the role back.
drop role if exists report_sender;
delete from supabase_migrations.schema_migrations where name = 'route_report';
commit;
