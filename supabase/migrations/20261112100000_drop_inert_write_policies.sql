-- ParaPo — the write policies on the four map tables go: they let nothing through.
--
-- 0005 and 0015 gave route, route_variant, stop and route_stop an insert, an
-- update and a delete policy each, for editors. Since lock_map_tables no app
-- role holds the grants those policies would apply to: anon lost its writes in
-- 0017, authenticated in lock_map_tables, and the map changes only through the
-- draft functions, which run with their owner's rights and are not subject to
-- these policies. So the twelve policies decide nothing. They are dropped so
-- the rules on these tables say what is true: read policies only.
--
-- Kept as they are:
--   - both read policies on each table (<table>_read_approved for anon and
--     authenticated, <table>_read_editor for editors). They are not merged
--     into one: a single policy would make anon evaluate private.is_editor(),
--     which anon may not run, and every public read would fail.
--   - takedown's two read policies. The nightly publish reads takedowns with
--     the publishable key (scripts/publish/read-database.mjs).
--   - row level security itself, on all four tables.
--
-- No data, grant or function changes. What every role can read and write is
-- the same before and after; supabase/verify/drop-inert-write-policies.sh
-- runs the publish's reads either side and compares them.
--
-- Order: after 20261105190000_lock_map_tables (its apply refuses without it,
-- and refuses if any app role still holds a write grant on these tables).
-- Not applied by the session that wrote it: the owner applies it, as postgres,
-- from supabase/apply/20261112100000_drop_inert_write_policies_apply.sql,
-- then records the ledger version. Safe to run twice. Undo:
-- supabase/apply/20261112100000_drop_inert_write_policies_revert.sql.

drop policy if exists route_insert on public.route;
drop policy if exists route_update on public.route;
drop policy if exists route_delete on public.route;
drop policy if exists route_variant_insert on public.route_variant;
drop policy if exists route_variant_update on public.route_variant;
drop policy if exists route_variant_delete on public.route_variant;
drop policy if exists stop_insert on public.stop;
drop policy if exists stop_update on public.stop;
drop policy if exists stop_delete on public.stop;
drop policy if exists route_stop_insert on public.route_stop;
drop policy if exists route_stop_update on public.route_stop;
drop policy if exists route_stop_delete on public.route_stop;
