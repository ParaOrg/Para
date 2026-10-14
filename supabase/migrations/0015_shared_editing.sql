-- ParaPo — every editor edits every route and hotspot
--
-- The owner's ask, 2026-10-14, adding two editors: "they can edit everyone's
-- route". Until now each write policy asked two questions, "is the caller on
-- the editor list?" (0005) and "is this row the caller's?" (0001). The
-- second meant an editor could fix or delete only what they had saved
-- themselves. Updates and deletes now ask only the first.
--
-- What stays:
--   - Inserts still need owner_id = the caller, so a row records who made it
--     (the column defaults to auth.uid(); the studio never sets it).
--   - Reads are unchanged: routes, directions, hotspots and their links are
--     public, as the public map needs.
--   - gps_session stays each editor's own: a recorded trip is personal.
--   - The editor list itself (private.editor) and is_editor() are untouched.
--   - TRUNCATE stays revoked (0005).
--
-- With check on update is the list alone, not the owner too: an edit leaves
-- owner_id as it was (the studio never writes it), and the row's maker stays
-- recorded.
--
-- Reversible by re-running 0005's policy block for route, route_variant,
-- stop and route_stop.

-- route
alter policy route_update on public.route
  using ((select private.is_editor()))
  with check ((select private.is_editor()));
alter policy route_delete on public.route
  using ((select private.is_editor()));

-- route_variant
alter policy route_variant_update on public.route_variant
  using ((select private.is_editor()))
  with check ((select private.is_editor()));
alter policy route_variant_delete on public.route_variant
  using ((select private.is_editor()));

-- stop
alter policy stop_update on public.stop
  using ((select private.is_editor()))
  with check ((select private.is_editor()));
alter policy stop_delete on public.stop
  using ((select private.is_editor()));

-- route_stop: no owner of its own. It followed its direction's owner; now
-- any editor links any direction to any hotspot, inserts included, since
-- the link is part of editing either side.
alter policy route_stop_insert on public.route_stop
  with check ((select private.is_editor()));
alter policy route_stop_update on public.route_stop
  using ((select private.is_editor()))
  with check ((select private.is_editor()));
alter policy route_stop_delete on public.route_stop
  using ((select private.is_editor()));
