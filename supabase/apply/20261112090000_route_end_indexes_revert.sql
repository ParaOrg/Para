-- ParaPo — undo 20261112090000_route_end_indexes on the live project. One transaction: drops the
-- two indexes and removes the ledger row. Touches no data. Safe to run twice.

begin;
drop index if exists public.route_head_stop_id_idx;
drop index if exists public.route_tail_stop_id_idx;
delete from supabase_migrations.schema_migrations where name = 'route_end_indexes';
commit;
