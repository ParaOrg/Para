# 05: The operations handbook

Status: resolved (docs/operations.md; the owner's questions are in its PR)
Type: task
Who: Opus

## The problem

Para runs on accounts and services only the owner holds: GitHub, Cloudflare (two accounts), Supabase, Namecheap, Resend, Google Play and Apple later. What lives where, what it costs, what renews when, and what to do when something breaks are spread across ADRs, workflow comments and chat. If the owner is away or a key is lost, nobody can pick it up.

## What to write

`docs/operations.md`, one page, in the house voice (`.claude/CLAUDE.md`, `CONTEXT.md`):

1. **Where everything lives:** a table with each service and account, what Para keeps there, who can sign in, and where its keys or secrets are kept. Name the place (GitHub secret `R2_BUCKET`, the owner's password manager); never the value.
   - Read the repo to build it: the workflows, `wrangler.jsonc` files, `.env.production`, `docs/adr/`, `.scratch/custom-domain/` and `.scratch/contribute/issues/15-weekly-backup-to-r2.md`.
   - Mark what you could not confirm from the repo with "(owner to confirm)".
2. **Costs and limits:** each service's plan, its free allowance and what happens at the limit, with the source and date of each number.
3. **Renewals and dates:** the domain (2026-12-23), certificates if any, API tokens with an expiry, and the signing keys.
4. **Runbooks,** one short section each, with what you'd see, the first check, and the fix:
   - the map is blank;
   - the street map is blank but routes show (the tiles);
   - the published map is stale;
   - a publish failed;
   - a backup failed;
   - the tiles build failed;
   - a sign-in or Turnstile error;
   - the domain or HTTPS is wrong;
   - Supabase is down.

   Link the `alert` issues from 04.
5. **The restore rehearsal:** step by step, how the owner restores one backup to a scratch database on their own computer, using `.github/backup/` and the steps in `backup.yml`'s header. Only the owner holds the private key, so this is written for the owner to do, not run by a session.
6. **Account safety checklist:** two-factor on every account, recovery codes stored offline, a second trusted person (owner to decide), and the old Villaralvorovic2 Cloudflare account's remaining pieces (the Turnstile widget and the old `parapo` Worker).

## Rules

Docs only. No secret values, and no account emails beyond what the repo already holds.

## Files it owns

`docs/operations.md`, and a link to it from `README.md`.

## Acceptance checks

- Every service in the repo appears in the table.
- Every runbook names the file or dashboard page it relies on.
- The PR lists the "(owner to confirm)" items as questions for the owner.

## Comments

**2026-10-28, the builder.** `docs/operations.md`, linked from `README.md`. Built from the workflows, both `wrangler.jsonc`, `.env.production`, `.env.apk`, the ADRs, `.scratch/custom-domain/`, contribute/15 and the migrations, plus the hub's live checks of 2026-10-28 (the domain, the routes, Turnstile's account, Workers pricing, Resend). R2 and Supabase limits are from their docs as read that day. What the repo can't confirm is marked "(owner to confirm)" and listed as questions in the PR. The alerts link points at the label `alert`, which 04 will use. The restore rehearsal is the owner's to run; its result goes here.
