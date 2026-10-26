# 13: Sending on Save, and "Delete my recordings"

Status: ready-for-human (owner: send a ride from a real phone, offline then online, and decide whether the per-recording Remove is enough instead of one "Delete my recordings" button)
Type: task
Wave: 4
Who: Sonnet
Blocked by: 08, 09, 10

## What to build

`../spec.md`, "Offline, saving and sending" and "Identity and the database"; `../database.md` §3 and §4.

- **The client,** made in `src/app/contribute/main.tsx` with its own auth storage key, `parapo.contributor-auth`, so it never touches an editor's studio session. The environment parsed in `src/features/contribute/api/env.ts` (or where 03 put it).
- **The first Save:** the Turnstile widget (`src/shared/ui/turnstile.tsx`, from 07), then `signInAnonymously` with its token.
- **Sending:** `save_contribution` with the recording packed by `point-pack.ts` (10). `already saved` counts as sent. Retried when the phone comes online, when the page comes back to the front, and when it opens. No reliance on Background Sync.
- **The count of recordings waiting** for Ready; "Sent" or "Waiting for signal" for Saved.
- **"Delete my recordings":** deletes the phone's contributions in the database, then its copies on the phone, after asking once.
- **Errors in plain words:** what happened and what to do, never a raw error.
- **`check-build.mjs`:** the contributor page carries the Supabase client but names no studio table (`route_variant`, `route_stop`, the `signboards` bucket); the public page still carries no Supabase client.

## Files it owns

`src/features/contribute/api/`, `src/app/contribute/main.tsx`, the contributor section of `scripts/checks/check-build.mjs`, a headless suite with the network faked off, then on.

## Acceptance checks

- 08's checklist, run with a real phone through the page.
- Offline, then online: the recording is sent once.
- With an editor signed in to the studio in the same browser, a save on `/contribute/` leaves the studio's session alone.
- `npm run check` passes.

## Comments

2026-10-26, status check on `staging`. Mostly done; it grew into accounts (contributor-accounts, resolved). Evidence: client with its own storage key in `src/features/contribute/api/contribute-client.ts` (`parapo.contributor-auth`), `upload-contribution.ts` (`uploadContribution`, `removeUpload`), `pack-recording.ts`, retries on online and visibility in `use-uploads.ts`, plain-word errors in `upload-problem.ts`, check-build checks that the contributor page carries Supabase but names no studio table, `tests/e2e/upload-test.mjs`, unit `upload-problem-test.mjs`. The owner's upload from the phone worked on 2026-10-23 (09's Answer). Not as written: there is no single "Delete my recordings" button, only removing one upload at a time (`use-remove-account-upload-mutation.ts`). Needs `20261019125900_contributions` (applied) and, for accounts, `20261024090000_contributor_accounts` (NOT applied yet).
