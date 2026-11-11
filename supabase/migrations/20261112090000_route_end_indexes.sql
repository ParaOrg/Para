-- ParaPo — an index on each of a route's two ends.
--
-- route.head_stop_id and route.tail_stop_id point at stop (0006) and have no
-- index. Postgres looks a stop up in both columns whenever a stop row is
-- deleted, to see that no route still ends there, and the rule that refuses
-- to take down a hotspot which ends an approved route
-- (private.stop_takedown_guard) looks the routes up by their ends. With no
-- index each lookup reads the whole route table. It is small today; these
-- keep the lookups short as the map grows.
--
-- Left as they are, on purpose: the indexes on the *_by columns
-- (route_last_saved_by_idx, route_published_by_idx, stop_last_saved_by_idx,
-- stop_published_by_idx, draft_last_saved_by_idx, takedown_put_back_by_idx).
-- The database advisor lists them as unused because no query of the app's
-- reads by them. They cover the foreign keys to auth.users, which Postgres
-- uses when a user is deleted, to set those columns to null. They must stay.
--
-- No data changes. Building each index holds off writes to route for a moment;
-- the table has a few dozen rows.
--
-- Not applied by the session that wrote it: the owner applies it, as postgres,
-- from supabase/apply/20261112090000_route_end_indexes_apply.sql, then records
-- the ledger version. Safe to run twice. Undo:
-- supabase/apply/20261112090000_route_end_indexes_revert.sql.

create index if not exists route_head_stop_id_idx on public.route (head_stop_id);
create index if not exists route_tail_stop_id_idx on public.route (tail_stop_id);
