# Applying 0018 to the live project

Three files, each pasted whole into the SQL editor as `postgres`:

| File | What it does |
| --- | --- |
| `0018_apply.sql` | One transaction: checks 0021 is applied, records what `anon` reads, applies `migrations/0018_review.sql` (carried unchanged; `verify/run.sh` checks the copy), checks `anon` reads exactly the same rows, that no other read rule would show a taken-down row, and that the three uniqueness indexes are 0018's, then writes the ledger row `0018_review`. Any failed check raises and nothing is changed, ledger included. Safe to run twice. |
| `0018_check.sql` | Read-only, one row per check; every `ok` should be `t`. Rows 3 and 4 (every route/hotspot approved) hold until the studio takes something down. |
| `0018_revert.sql` | One transaction: undoes 0018 and removes its ledger row. Refuses, changing nothing, once a row is taken down or a draft is kept. |

## Steps

1. Run `0018_apply.sql`. It ends with `COMMIT`; an error means nothing changed.
2. Run `0018_check.sql`: 13 rows, all `ok = t`.
3. Check what the publish reads, with the publishable key (the session that
   wrote this can do it): row counts through the API must be unchanged.
   Before 0018 (2026-10-18): 10 routes, 20 directions, 103 hotspots, 256
   links, 0 Ikot.
4. Regenerate `src/shared/types/database.types.ts` and add the ledger version
   to `migrations/README.md`.

## Recovery

- Apply failed: nothing changed. Read the message; each names what it found.
- Applied, and the studio or the publish misbehaves: run `0018_revert.sql`.
  It puts the schema back exactly as 0021 left it (`verify/run.sh` compares a
  schema dump before and after) and deletes the ledger row. No data row is
  lost: 0018 only adds columns, tables, triggers, indexes and read rules.
- Once a takedown or draft exists, the revert refuses: undoing would publish
  what was taken down and drop the drafts. Put the rows back (status
  `approved`) and settle the drafts first.

## While it runs

The `alter table` statements lock `route`, `route_variant`, `stop` and
`route_stop` for a moment (small tables, no rewrite). The public map reads
published files, not the database, so commuters see nothing; an editor saving
at that moment waits for it.
