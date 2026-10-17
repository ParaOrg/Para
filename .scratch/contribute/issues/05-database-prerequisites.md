# 05: Database prerequisites: types, the ledger, 0014's index

Status: resolved
Type: task
Wave: 2, before any other migration
Who: Sonnet
Blocked by: 02, 03

## What to build

`../database.md` §9.

1. **Generated types.** Generate `database.types.ts` from the live schema, read-only (the Supabase MCP's `generate_typescript_types`, or `supabase gen types`), into the place 03 put in `.claude/CLAUDE.md` (proposed: `src/shared/types/database.types.ts`). Type the studio's client as `SupabaseClient<Database>` (`src/features/studio/data/supabase.ts`). Fix what the types reveal where it is small; anything larger is listed in the PR for its own ticket. No behaviour change.
2. **The migration ledger.** The SQL in `../database.md` §9, in the PR body, for the owner to run as `postgres`. And `supabase/migrations/README.md`: a table of each file and its ledger version, since the files are numbered and the ledger is timestamped.
3. **0014's old index.** `supabase/migrations/0016_finish_terminal_index.sql`: `drop index if exists stop_terminal_informal_unique;`, with a header in 0014's style (why, not applied by the session that wrote it, reversible with 0014's own lines).

## Files it owns

`src/shared/types/database.types.ts` (or the approved place), `src/features/studio/data/supabase.ts` and the `studio/data/` files the types touch, `supabase/migrations/0016_finish_terminal_index.sql`, `supabase/migrations/README.md`.

## Acceptance checks

- `npm run check` passes, with no new `any`, `!` or `as`.
- The migration is written, not applied. After the owner applies it and runs the ledger SQL, `list_migrations` shows 0001 to 0016 under their files' names, and `pg_indexes` shows one terminal index.
- The advisors show nothing new.

## Answer

Built in [PR #254](https://github.com/Roviicc/ParaPo/pull/254). The owner ran the ledger SQL and applied 0016 on 17 October. `list_migrations` shows 0001 to 0016 under their files' names, `pg_indexes` shows one terminal index (`stop_terminal_place_unique`), and the advisors show only the four notices already listed in `../database.md` and the blind-spot audit (leaked-password protection off, `private.editor` with no policies on purpose, one unindexed foreign key, one unused index).

## Comments
