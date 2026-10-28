# 15: The weekly backup to Cloudflare R2

Status: ready-for-human (owner: R2 bucket with 60-day rule and token; gpg key pair, commit the public key as .github/backup/owner-public-key.asc; apply 20261022100000_backup_reader.sql and set the role password; add the GitHub secrets; run the workflow once and a restore)
Type: task
Wave: 4, before the Contributor button goes public
Who: Sonnet, with the owner's setup
Blocked by: 02, 08

## What to build

`../database.md` §7.

- **`supabase/migrations/0020_backup_reader.sql`:** a login role `backup_reader` with SELECT on the tables 02 chose (recommended: the contributor tables and the route tables, never `private.editor`) and a read rule `to backup_reader` on each. No password in the file: the owner sets it.
- **`.github/workflows/backup.yml`,** weekly and on demand:
  - `pg_dump` of those tables as `backup_reader`;
  - compressed, then encrypted with `gpg` to the owner's public key (the public key committed beside the workflow; the private key never on GitHub);
  - uploaded to the private R2 bucket through its S3 API;
  - prints sizes and counts only. No GitHub artifact, no issue with data in it: the repo is public, and so are its logs.
- **The restore steps,** in the workflow's header: download, decrypt, `psql` into a local Postgres.

**The owner's part:** the R2 bucket, its 60-day lifecycle rule and a token scoped to it; the gpg key pair; the role's password; the GitHub secrets (the connection string, the R2 keys and endpoint). Check that the pooler accepts the role.

## Files it owns

`supabase/migrations/0020_backup_reader.sql`, `.github/workflows/backup.yml`, the public key file.

## Acceptance checks

- A run by hand puts one encrypted file in the bucket; its log shows no data.
- A restore into a local Postgres works once, and the PR says how long it took.
- The advisors show nothing new.

## Comments

2026-10-26, status check on `staging`. Code done in 0d49e806 and 0c01cc6f: `supabase/migrations/20261022100000_backup_reader.sql` (the planned 0020; written, NOT applied) and `.github/workflows/backup.yml` with the owner's setup steps and restore steps in its header. Missing: the public key file `.github/backup/owner-public-key.asc` (only a README is there), and every owner step. Needs `20261022090000_contribution_use` applied first (it is), then `20261022100000_backup_reader`.
