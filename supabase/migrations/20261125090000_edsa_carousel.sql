-- Para — the EDSA Carousel: the busway on EDSA, Monumento to PITX
--
-- The owner's ask, 2026-11-24: the EDSA Carousel on the map, drawn in the
-- studio. Its buses run in their own lane and stop only at their own
-- stations, so it is a line as a train (0011) and the ferry (0012) are: a
-- route whose mode is 'busway', and stations that are hintuans whose `line`
-- is 'EDSA-C'. It stops only at them, and no jeep at them (servedBy,
-- routes.ts). Unlike a train's, its route needs no `route_code`: its mode
-- names its one line (lineOfMode, busway.ts), so a route drawn in the
-- studio, whose draft never writes `route_code`, is a line all the same.
--
-- Additive, with no rewrite and no new value used here (a value added to an
-- enum cannot be used in the transaction that adds it). Reversible with
--   alter table stop drop constraint stop_line_named;
--   alter table stop add constraint stop_line_named check (line is null or line in ('LRT-1', 'LRT-2', 'MRT-3', 'PRFS'));
-- once no stop is an EDSA-C station. An enum value cannot be dropped; one no
-- row uses is harmless.
--
-- Written, not applied: the owner applies it, as postgres, from
-- supabase/apply/20261125090000_edsa_carousel_apply.sql, then records the
-- ledger version. Undo: supabase/apply/20261125090000_edsa_carousel_revert.sql.

alter type transport_mode add value if not exists 'busway';

alter table stop
  drop constraint stop_line_named,
  add constraint stop_line_named check (line is null or line in ('LRT-1', 'LRT-2', 'MRT-3', 'PRFS', 'EDSA-C'));

comment on column stop.line is
  'The line this hintuan is a station of: a train''s (LRT-1, LRT-2, MRT-3), the ferry''s (PRFS) or the EDSA Carousel''s (EDSA-C); null for every other hotspot.';
