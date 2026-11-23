# 16: Add get_my_uses to the schema snapshot

Status: ready-for-agent
Type: task
Who: a session with Postgres 17 (the snapshot's dump needs PG17 privileges such as `maintain`)
Blocked by: none

## What to build

`20261106090000_my_contribution_uses` (`public.get_my_uses()`, #674 by Simonee, carried by #810) is applied live (ledger `20261106090000`, via the SQL Editor on 2026-11-06) and recorded in `supabase/migrations/README.md`, but `supabase/schema/snapshot.sql` does not have it yet.

- Add `20261106090000_my_contribution_uses` to `APPLIED` in `supabase/verify/schema-snapshot.sh`, after `20261105200000_drop_dead_weight`.
- Rewrite the snapshot on a disposable Postgres 17: `PSQL="..." bash supabase/verify/schema-snapshot.sh --write`.
- The diff should be only the new function and its grants. Then run the script without `--write`: it must report a match.

## Files it owns

`supabase/verify/schema-snapshot.sh`, `supabase/schema/snapshot.sql`.

## Acceptance checks

- The snapshot holds `get_my_uses`, with execute granted to `authenticated` only.
- `schema-snapshot.sh` (check mode) passes.
