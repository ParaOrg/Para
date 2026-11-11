-- The reads the nightly publish makes with the publishable key, as anon: the same columns, filters
-- and order scripts/publish/read-database.mjs asks PostgREST for (tables() and takedowns()).
-- drop-inert-write-policies.sh runs this before and after its migration and compares the output:
-- a change to the tables' policies must not change one row the publish is given.
set role anon;
select v.id, v.route_id, v.direction_name, v.origin_terminal, v.destination_terminal, v.shape, v.confidence,
  v.reversed, v.signboards,
  (select to_jsonb(r) from (
     select id, revision, signboard, route_code, long_name, mode, fare_note, head_stop_id, tail_stop_id, via, is_loop
     from public.route where id = v.route_id) r) as route
from public.route_variant v
order by v.id asc;
select id, revision, name, informal, aliases, kind, point, area, note, created_at, line
from public.stop
order by id asc;
select route_variant_id, stop_id, stop_sequence
from public.route_stop
order by route_variant_id asc, stop_sequence asc, stop_id asc;
select kind, subject_id, taken_down_at, put_back_at
from public.takedown
where put_back_at is null;
reset role;
