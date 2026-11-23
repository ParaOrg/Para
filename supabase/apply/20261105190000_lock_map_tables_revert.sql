-- ParaPo — undo lock_map_tables: editors may insert, update and delete route, route_variant, stop and
-- route_stop directly again, under the write policies of 0005 and 0015. Touches no data. One
-- transaction; safe to run twice.
begin;
grant insert, update, delete on public.route, public.route_variant, public.stop, public.route_stop
  to authenticated;
delete from supabase_migrations.schema_migrations where name = 'lock_map_tables';
commit;
