# 04: The drift and keep-awake check

Status: needs-info (waits on 01, 02)
Type: task
Who: Opus

## What to build

A daily step in the watch (`.github/workflows/watch.yml`, `scripts/watch/`) that:

- reads the list of applied migrations from both projects, read-only, using a read-only role per project held in GitHub secrets the owner adds;
- opens an `alert` issue when staging is missing a migration live has, or live is more than a week behind staging;
- by reading, also keeps `para-staging` from pausing. Confirm in Supabase's docs that a database read counts as activity.

## Rules

Read-only roles only. The live project's read role can be the backup's `backup_reader` only if it can read the migrations table; otherwise a new read-only role, written as a migration for the owner.

## Done when

The check passes on matching lists, opens an alert when one migration is missing on staging, and closes it once applied.

## Comments
