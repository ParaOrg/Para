# 05: Migrations, staging first, then live

Status: needs-info (waits on 01)
Type: task
Who: Opus writes the steps, the owner follows them

## What to write

The order every migration follows from now on, in `supabase/apply/README.md` and `docs/operations.md`:

1. A session writes the migration and its verify script, in a PR.
2. The owner applies it to `para-staging`.
3. The owner, or a session on the staging site, tries the change there.
4. The owner applies it to the live project, and the nightly publish carries any map change.

Also say what to do when a migration fails on staging: nothing has touched live, so fix the migration in a new PR.

## Done when

Both docs carry the order, and the next migration follows it.

## Comments
