# 01: The database for the review step

Status: ready-for-agent
Type: task
Wave: 2
Who: Sonnet; Opus reviews before the owner sees it
Blocked by: contribute/02, contribute/05, contribute/06

## What to build

`supabase/migrations/0018_review.sql`, as `../../contribute/database.md` §8 describes and as contribute/02 approved it:

- **`route` and `stop`** gain `status` (`approved` or `taken_down`, default `approved`) and `status_at`. `stop` gains `updated_at` with the existing touch trigger.
- **The uniqueness rules** stay, read on approved rows: `route_ends_unique` and `stop_terminal_place_unique` become partial, `where status = 'approved'`. `route_variant_one_per_direction` stays as it is.
- **`draft`:** one row per route or hotspot being changed, unique `(kind, subject_id)` (the owner's 8a), its payload as JSON, `base_updated_at`, `editor_id`, `note`. Editors only.
- **`takedown`:** what was taken down and when. `anon` gets SELECT on `kind`, `subject_id` and `taken_down_at` only (a column grant); editors insert.
- **`editor_name`:** `user_id` (references `private.editor`) and `name`, readable by editors, written by the owner by hand.
- **Two guards, as triggers:** a route is approved only with both ends approved; a hotspot that ends an approved route can't be taken down.
- **The read rules:** each of `route_read`, `route_variant_read`, `stop_read` and `route_stop_read` becomes an approved-only rule for `anon` and `authenticated` (a direction by its route, a link by both ends), plus an editors-see-everything rule using `private.is_editor()`.
- **Grants** written out for each new table (after contribute/06, nothing is granted by default).
- **The header:** why (three editors, every save public that night), that every existing row becomes approved so commuters see no change, how to reverse it, and that it is not applied by the session that wrote it.
- Regenerate the types.

## Files it owns

`supabase/migrations/0018_review.sql`, the regenerated types. One migration session at a time.

## Acceptance checks

- Written, not applied. After the owner applies it:
  - the publish, run by hand, writes byte-identical files (everything is approved);
  - the studio still lists and saves as before (it doesn't know about drafts until 05);
  - the first query in `../../contribute/database.md` §13 no longer lists the four `using (true)` rules;
  - in a transaction rolled back, as an editor: approving a route whose end is taken down is refused, and taking down a hotspot that ends an approved route is refused.
- The advisors show nothing new.

## Comments

- **2026-10-17, from the loops work (0021_loops.sql):** a loop is a route with `is_loop` and no head or tail. When 0018 is written: make `route_loop_unique` (0021) partial on `status` as well, as the other partial unique indexes are, and let the "route is approved only with both ends approved" guard pass a loop, whose ends are null. 0021 is written but takes the next number after 0017 that was free of a reservation; 0018 to 0020 keep theirs.
