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

# Applying 0022 to the live project

0018 must already be applied (it is, ledger `20261018054405`). Three files,
each pasted whole into the SQL editor as `postgres`:

| File | What it does |
| --- | --- |
| `0022_apply.sql` | One transaction: checks 0018 is applied, applies `migrations/0022_draft_ops.sql` (carried unchanged; `verify/run.sh` checks the copy), checks the seven review functions exist and `anon` cannot run them, then writes the ledger row `0022_draft_ops`. Any failed check raises and nothing is changed. Safe to run twice. Adds functions and one trigger only; no table or row changes. |
| `0022_check.sql` | Read-only, 10 rows, all `ok` should be `t`. Privileges are read with `has_function_privilege`, which counts PUBLIC and inherited grants: `anon` and PUBLIC execute nothing, `authenticated` executes the seven review functions but none of the eight helpers. |
| `0022_revert.sql` | One transaction: drops the seven functions, the eight private helpers and the link trigger, and removes the ledger row. Touches no data. Safe to run twice. |

## Steps

1. Run `0022_apply.sql`. It ends with `COMMIT`; an error means nothing changed.
2. Run `0022_check.sql`: 10 rows, all `ok = t`.
3. Tell the session; it checks through the API that `anon` gets refused by the
   functions and the public row counts are unchanged, then regenerates
   `src/shared/types/database.types.ts` and records the ledger version.

## Recovery

- Apply failed: nothing changed. The message names what it found.
- Applied, and something misbehaves: run `0022_revert.sql`. `verify/run.sh`
  checks the schema afterwards matches 0018 alone and that 0022 re-applies.
  Drafts and takedowns are 0018's tables and are kept. Undo 0022 before ever
  undoing 0018.
- The studio does not call these functions yet, so neither applying nor
  reverting changes what an editor or commuter sees today.

# Applying the contributions migration to the live project

**Not applied live.** Needs the owner's approval. Applying it creates the
tables only: no phone can upload until anonymous sign-ins and CAPTCHA
(Turnstile) are turned on in Supabase Auth, a separate owner step, and the studio's
Turnstile sign-in must ship before CAPTCHA is turned on project-wide.

| File | What it does |
| --- | --- |
| `20261019125900_contributions_apply.sql` | One transaction: checks the editor check (0005) exists, anon cannot write routes (0017), and it has not run; applies `migrations/20261019125900_contributions.sql` (carried unchanged; `verify/contributions.sh` checks the copy); checks row security and that anon reaches nothing; writes the ledger row `contributions`. A second run stops at the first check and changes nothing. Adds tables, functions and triggers; touches no route data. |
| `20261019125900_contributions_check.sql` | Read-only, 9 rows, all `ok` should be `t`. |
| `20261019125900_contributions_revert.sql` | One transaction: drops the four tables, `save_contribution` and the five private helpers, and removes the ledger row. Refuses while any contribution is stored, since that would delete phones' recordings. Safe to run twice. |

## Steps

1. Run `20261019125900_contributions_apply.sql`. It ends with `COMMIT`; an error means nothing changed.
2. Run `20261019125900_contributions_check.sql`: 9 rows, all `ok = t`.
3. Regenerate `src/shared/types/database.types.ts` in the classic format, and record the
   ledger version in `migrations/README.md`.

## Recovery

- Applied, and nothing has been uploaded: run `20261019125900_contributions_revert.sql`.
  `verify/contributions.sh` checks the schema afterwards matches the schema before, and that it re-applies.
- Applied, and phones have uploaded: the revert refuses. Decide with the owner what happens to those recordings first.
