# 01: Database

Status: ready-for-human
Type: task
Blocked by: none

Needs the owner's Yes on the storage idea in `spec.md` before building.

## What to build

One migration adding the storage for attached stretches: each belongs to a direction and holds its side (start or end), its line, its terminal hotspot, its join point as a distance along the main line, and its fare information (open question 1). Row Level Security like the route tables. Regenerate `src/shared/types/database.types.ts`.

Decide and write down in the ticket's Comments: separate table or columns; how the return trip is stored (open question 6); how fares are stored (open question 1, the owner decides).

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
