# Checking a migration on a throwaway database

`run.sh` builds a fresh database from every migration in ledger order on a
plain Postgres (no Supabase project), adds rows as the live project has them,
applies `0018_review.sql` over them twice, then checks it:

- `bootstrap.sql`: stand-ins for what the migrations expect of Supabase
  (`anon`, `authenticated`, `auth.users`, `auth.uid()`, `storage`). Only for a
  throwaway server.
- `before-0018.sql`: rows that exist before the migration.
- `after-0018.sql`: reads as `anon`, a signed-in non-editor and an editor;
  uniqueness on approved rows (routes, loops, terminals); the two guards; the
  takedown log; the aggregate revision; drafts.
- `concurrency.sh`: two sessions race an approval against a take-down of one
  of its ends, in both orders.

```sh
docker run -d --name pg-verify -e POSTGRES_PASSWORD=pw postgres:17
PSQL="docker exec -i pg-verify psql -U postgres" supabase/verify/run.sh
docker rm -f pg-verify
```

It ends with `after-0018: all checks passed` and `concurrency: both orders
refused`, or stops at the first failure.
