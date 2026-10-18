# Checking a migration on a throwaway database

`run.sh` builds a fresh database from every migration in ledger order on a
plain Postgres (no Supabase project), adds rows as the live project has them,
applies 0018 over them twice through `../apply/0018_apply.sql` (the file the
owner pastes), then checks it, and undoes it on a second database:

- `bootstrap.sql`: stand-ins for what the migrations expect of Supabase
  (`anon`, `authenticated`, `auth.users`, `auth.uid()`, `storage`). Only for a
  throwaway server.
- `before-0018.sql`: rows that exist before the migration.
- `after-0018.sql`: reads as `anon`, a signed-in non-editor and an editor;
  uniqueness on approved rows (routes, loops, terminals); the two guards; the
  takedown log; the aggregate revision; drafts.
- `concurrency.sh`: two sessions race an approval against a take-down of one
  of its ends, in both orders.
- `after-0022.sql`, after `../apply/0022_apply.sql` (twice) and
  `../apply/0022_check.sql`: the review operations refuse anon and
  non-editors; a malformed payload is `bad_payload`; draft saves leave
  `route`/`stop` untouched; approve writes the hotspot, route, direction,
  signboards and links, and a retry is `no_draft`; a link changed after
  drafting is a `conflict` that leaves the route and draft as they were;
  stale send-back/discard are `revision_mismatch`; emptying every direction
  takes the route down (logged); put back and take down refuse a repeat.
- `concurrency-0022.sh`: two sessions race `approve_draft` against a live
  edit of its route in both orders (edit first: `conflict`, nothing applied;
  approval first: it lands whole and the edit lands on top) and against a
  second approval of the same draft (`approved` / `no_draft`).
- `../apply/0018_check.sql` must be all true after the apply, and
  `../apply/0018_revert.sql` must refuse over a takedown and, on a clean
  database, leave a schema dump identical to one 0018 never touched.

```sh
docker run -d --name pg-verify -e POSTGRES_PASSWORD=pw postgres:17
PSQL="docker exec -i pg-verify psql -U postgres" supabase/verify/run.sh
docker rm -f pg-verify
```

A third database applies 0018, then 0022, then `../apply/0022_revert.sql`
twice: the schema dump must match 0018 alone, the ledger row must be gone,
and re-applying 0022 must pass `0022_check.sql` again.

It ends with `0022 revert: schema as before 0022 (twice), ledger row gone,
re-apply passes 0022_check.sql`, or stops at the first failure.
