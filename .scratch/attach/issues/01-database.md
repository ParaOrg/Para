# 01: Database

Status: ready-for-human
Type: task
Blocked by: none

The owner said Yes to the storage in `spec.md` on 2026-11-28. Building still waits for the owner's Yes to start.

## What to build

One migration adding the storage for attached stretches: each belongs to a direction and holds its side (start or end), its line, its terminal hotspot, its join point as a point with the index of the main line's control point just before it (ADR 0009's amendment of 2026-11-11). No fare information: a ride from an attached terminal costs the main line's fare. Row Level Security like the route tables. Regenerate `src/shared/types/database.types.ts`.

Decide and write down in the ticket's Comments: separate table or columns. The return trip is decided: an attached end on the return is its own stretch on the return direction.

## Files it owns

- `supabase/migrations/<timestamp>_attached_stretches.sql`
- `src/shared/types/database.types.ts` (regenerated, never by hand)
- `src/features/studio/data/` (reads and writes of stretches, with Zod, translating snake_case at the boundary)

## Acceptance checks

- `npm run check` passes.
- The migration applies on `staging-backend` and rolls back cleanly.
- A stretch cannot exist without its direction, and is removed with it.
- Only editors can write; the public cannot read the table (commuters read the published map only, ADR 0001).
- The data check still passes on a database with no stretches.

## Comments

- 2026-11-28, the owner (through the hub): Yes to the storage idea (each attached stretch belongs to a direction: side, own line, terminal hotspot, join point as a point and a control-point index). Fares: "a ride from an attached terminal costs the SAME fare as the main line"; nothing is stored per stretch. Return trip: an attached end on the return is drawn separately, as its own stretch on the return direction. The status stays: building needs the owner's Yes to start.
