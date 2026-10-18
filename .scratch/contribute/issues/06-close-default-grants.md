# 06: Close the default grants (the policy audit's fix)

Status: resolved
Type: task
Wave: 2
Who: Sonnet
Blocked by: 05

## What to build

`../database.md` §2, fix 1. `supabase/migrations/0017_anon_writes_revoked.sql`:

- revoke INSERT, UPDATE, DELETE and MAINTAIN on every table in `public` from `anon`, which never writes; revoke MAINTAIN from `authenticated`, which the API never needs;
- alter the default privileges of `postgres` in `public` so a new table grants nothing to `anon` or `authenticated`. Each later migration grants what its rules need, so a forgotten grant fails closed;
- leave `anon`'s SELECT on the route tables (the publish reads them) and `authenticated`'s DML (editors, under row security);
- the header says why (the audit, and that every phone will be `authenticated`), what stays, and how to reverse it. As 0005 notes, a new function still revokes EXECUTE from `public` and `anon` in its own migration: a per-schema default can't.

## Files it owns

`supabase/migrations/0017_anon_writes_revoked.sql`, and the regenerated types.

## Acceptance checks

- Written, not applied. After the owner applies it:
  - the third query in `../database.md` §13 returns nothing;
  - the publish, run by hand ("Run workflow"), reads every table and writes byte-identical files;
  - the owner saves one change in the studio, and it works.
- The advisors show nothing new.

## Answer

Built in [PR #261](https://github.com/Roviicc/ParaPo/pull/261) and applied on 17 October at the owner's word (ledger `20261017091759`). Checked after: `anon` holds only SELECT on `route`, `route_variant`, `stop` and `route_stop`, and nothing on `gps_session`; `authenticated` holds SELECT, INSERT, UPDATE and DELETE on all five; `postgres`'s default privileges in `public` give `anon` and `authenticated` nothing on new tables or sequences; §13's third query returns no rows. With the publishable key, the publish's three reads return 200, and a read of `gps_session` or an update of `stop` is refused (42501). The security advisors show only the two notices from before.

## Comments
