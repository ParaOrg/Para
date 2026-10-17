-- ParaPo — anon never writes, and a new table grants nothing by default
--
-- The policy audit of 2026-10-17 (.scratch/contribute/database.md section 2,
-- fix 1). Row security already stops every write by an anonymous phone: no
-- write rule passes for a user who is signed in but not on private.editor. But
-- the privileges underneath were wide open. Read from the live project on
-- 2026-10-17 (pg_class.relacl, pg_default_acl):
--   - anon and authenticated each hold SELECT, INSERT, UPDATE, DELETE and
--     MAINTAIN (arwdm) on all five public tables (route, route_variant,
--     route_stop, stop, gps_session). TRUNCATE, TRIGGER and REFERENCES were
--     taken away in 0005.
--   - postgres's default privileges in public hand the same arwdm on every new
--     table to anon and authenticated, and rwU on every new sequence. So a
--     table whose migration forgets "enable row level security" is open to
--     anyone holding the publishable key, and every contributor's phone will
--     be signed in as authenticated (anonymous sign-in).
--
-- What this does:
--   1. anon loses INSERT, UPDATE, DELETE and MAINTAIN on every public table.
--      anon never writes: the map is read with the publishable key and the
--      studio signs in first.
--   2. authenticated loses MAINTAIN. The API never needs it (VACUUM, ANALYZE
--      and the like), and row security does not guard it.
--   3. anon keeps SELECT on route, route_variant, stop and route_stop, and
--      loses it on gps_session. The publish (scripts/publish/publish-map.mjs)
--      reads the publishable key's role over REST: route_variant with route
--      embedded, stop and route_stop. Nothing reads gps_session as anon, and
--      its only read rule is for authenticated.
--   4. authenticated keeps SELECT, INSERT, UPDATE and DELETE on all five
--      tables: the editors, held back by row security (0005, 0015).
--   5. The default privileges of postgres in public stop granting anything on
--      new tables and new sequences to anon and authenticated. Each later
--      migration grants what its own rules need, so a forgotten grant fails
--      closed ("permission denied"), never open. service_role keeps its
--      defaults (it bypasses row security by design and is never shipped).
--
-- What this does not cover:
--   - Functions. A new function in public is executable by everyone through
--     PUBLIC, a built-in default that no per-schema default can take away, so
--     changing the entries that give anon and authenticated EXECUTE would
--     only look safer. As 0005 notes, a function's own migration still runs
--     "revoke execute ... from public, anon" and grants it back to who needs it.
--   - Objects made by other roles (supabase_admin's defaults in public, the
--     auth and storage schemas). postgres cannot alter those and nothing here
--     is created by them.
--
-- Not applied by the session that wrote it; the owner applies it, as postgres,
-- from the SQL editor, with the ledger row of the README's "Applying a file".
-- The studio, the publish and the contributor tables (0019) are unaffected:
-- every grant they need is one that stays, or that 0019 gives.
--
-- Reversible with
--   grant insert, update, delete, maintain on all tables in schema public to anon;
--   grant select on public.gps_session to anon;
--   grant maintain on all tables in schema public to authenticated;
--   alter default privileges for role postgres in schema public
--     grant select, insert, update, delete, maintain on tables to anon, authenticated;
--   alter default privileges for role postgres in schema public
--     grant usage, select, update on sequences to anon, authenticated;

revoke insert, update, delete, maintain on all tables in schema public from anon;
revoke select on public.gps_session from anon;
revoke maintain on all tables in schema public from authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
