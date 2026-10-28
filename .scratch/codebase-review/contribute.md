# Codebase review 2026-10-28: The contributor page and app

The recorder is careful: every fix is written to the phone as it arrives, a killed app gets its ride back, and uploads can be sent twice without being stored twice.
The serious problems are at the edges: a signed-out session can quietly send an account's rides under a nameless identity, rides over four hours can never be sent, and a signed release can be made from code nobody reviewed.
Most fixes are small; five need the owner's say because they change words people read, the database, sign-in or the GitHub settings.

`npm run check` passes on `origin/staging` (63406c8): format, lint, build with its guards, 1172 unit checks. No browser suite was run. The live database's migration list was read (read only) to confirm what is applied.

## Findings

### contribute-01: A session that dies on the phone sends the account's rides under a new, nameless identity
- Severity: bug
- Where: src/features/contribute/use-uploads.ts:152-164, 207-212, 351-365; src/features/contribute/api/upload-contribution.ts:20-45; src/features/contribute/api/use-account-query.ts:17-18; src/features/contribute/contribute-page.tsx:48-53
- What happens: a contributor is signed in; their session then dies (the owner deletes the account as the consent text offers, the refresh token is revoked, or the session times out). Supabase removes the session from storage, but the page's account query never asks again (`staleTime: Infinity`, no refetch on focus), so the page still shows Ready. The next saved ride finds no identity, the upload code shows the person check, and on passing it `ensureSignedIn` signs the phone in **anonymously** and uploads there. The ride reaches the studio with no name and no account; the contributor's History on other phones never shows it. Nobody notices until an editor wonders why rides arrive with no name.
- Fix: with accounts on, `useUploads` must never sign in by itself. When `currentIdentity()` is null, stop sending, invalidate `accountKeys.session()` so the page shows Sign in, and leave the rides waiting. The anonymous sign-in, the Turnstile round and `UploadCheck` in the upload path are then dead and can go.
- Size: M
- Owner decides: yes (sign-in: the page sends the person back to Sign in)

### contribute-02: Any tag `app-v*` on any commit gets the signing key and becomes the update every tester is told to install
- Severity: security
- Where: .github/workflows/contributor-app.yml:25-27, 142-146, 271-300; docs/adr/0006 ("Where the secret lives")
- What happens: the `app-release` environment allows the tags `app-v*`. A tag can point at any commit, including a branch nobody reviewed. Anyone who can push to the repository (every building session has that right) pushes `app-v9.9.9` on their own branch; `build-release` decrypts the key, signs that code, and `publish` marks it latest. Every installed app reads `releases/latest/download/latest.json` and tells its tester "A new version is ready", or, with a raised `minVersion`, refuses Start until they install it. The ADR says "no pull request or other branch can read it", which is true of branches but not of tags.
- Fix: first step of `build-release`: `git fetch origin main` and refuse unless `git merge-base --is-ancestor "$GITHUB_SHA" origin/main`. And a tag ruleset in GitHub so only the owner can create `app-v*` tags.
- Size: S
- Owner decides: yes (GitHub settings, release process)

### contribute-03: On a shared phone, one person's rides are sent and shown as the next person's
- Severity: security
- Where: src/features/contribute/recording-schema.ts:56-81 (no account on a recording); src/features/contribute/use-uploads.ts:267-275; src/features/contribute/history-merge.ts:26-35; src/features/contribute/api/account.ts:274-283; src/features/contribute/api/earlier-identity.ts:118-138
- What happens: Ana records three rides on a family phone, signs out before they upload (no signal), and her brother Ben signs in. The rides are not anyone's on the phone, so they upload as Ben's, with Ana's start and end names and description; Ben's History lists them too, with "Delete" and "Download". The same happens to rides an anonymous phone sent before accounts: the first account to sign in on that phone claims them. Shared phones are common among the people Para hopes to reach. Nobody notices; the studio shows them under Ben's name.
- Fix: stamp the signed-in account's id on a recording at Start, send only recordings whose stamp matches the signed-in account, and show History only the current account's. On sign-out with unsent rides, say so and offer to keep or delete them.
- Size: M
- Owner decides: yes (what people see, sign-in)

### contribute-04: A ride longer than four hours of fixes can never be uploaded, and nothing says so until after Save
- Severity: bug
- Where: src/features/contribute/api/pack-recording.ts:118-119; src/features/contribute/recording-limits.ts:7; src/features/contribute/use-recording.ts:283-314 (no cap while recording)
- What happens: the app records one fix a second (the plugin's fixed rate); the browser about the same. The database keeps 14,400 points, which is four hours, though a contribution may be six hours long. A contributor records papunta and pabalik in one recording through EDSA traffic (switching the way, as the page invites): 4 h 20 min. Save works, then History says "Too large to upload. It stays on this phone." for good. There was no warning during the ride. A tester loses a whole afternoon's work.
- Fix: in `acceptedPoints`, when there are more than `UPLOAD_LIMITS.points`, keep evenly spaced points (thin to one every 2 s, then 3 s) instead of refusing; the line and totals are already computed from all fixes. Keep `too-long` for the six-hour limit, and say it on the recording screen as the ride nears it.
- Size: S
- Owner decides: yes if the recording screen gets a warning (words people see); no for the thinning alone

### contribute-05: A contributor can read the editor's private hide note, block note and which editor did it
- Severity: security
- Where: supabase/migrations/20261019125900_contributions.sql:270-271, 278-284; supabase/migrations/20261024090000_contributor_accounts.sql:65-66
- What happens: `authenticated` has select on every column of `contribution`, and on `contributor` keeps `blocked_by` and `block_note`. Row security rightly lets a contributor read their own rows, so with the public key and their own sign-in, `select hidden_note, hidden_by from contribution` and `select block_note, blocked_by from contributor` answer the editor's note ("spam, same guy as last week") and the editor's user id. Nobody notices until a note is read back to an editor.
- Fix: move the notes and the who-did-it columns out of reach of the contributor: either an editor-only table (`contribution_review`, `contributor_block`) with its own editor policy, or revoke those columns from `authenticated` and give the studio a definer function that checks `private.is_editor()`. The studio's reads change with it.
- Size: M
- Owner decides: yes (database)

### contribute-06: Removing an upload on one phone makes the other phone say an editor removed it
- Severity: bug
- Where: src/features/contribute/use-uploads.ts:304-333; src/features/contribute/upload-status.ts:22-25; src/features/contribute/history-groups.ts:92; also use-uploads.ts:72-86
- What happens: the consent text invites "Remove an upload in History on any phone you're signed in on". Phone B removes a ride that phone A also holds. When phone A next opens, it sees the upload missing and marks it `byEditor`: "Removed from Para by an editor". The contributor thinks an editor rejected their ride. The upload messages still speak of the phone too: "this phone has sent 20 recordings today" is the account's cap across phones, and "This phone cannot upload recordings" is a blocked account.
- Fix: the phone cannot tell who removed it, so say "Removed from Para. Kept on this phone" for a removal it did not make itself (drop `byEditor`), and change the two messages to "you" instead of "this phone".
- Size: S
- Owner decides: yes (words people see)

### contribute-07: The Save form saves and uploads on its own after two minutes, which ADR 0004 says only a tap does
- Severity: security
- Where: src/features/contribute/save-form.tsx:71-85; src/features/contribute/use-save-countdown.ts:16-37; src/features/contribute/use-uploads.ts:267-275; docs/adr/0004 ("only when they tap Save")
- What happens: the contributor taps Stop at home intending to Cancel (the ride started at their door) and pockets the phone; the ride also stops itself when it comes back to its start. Two minutes later the form saves, and the upload goes at once, home included. The countdown is on screen, so this may be the intended design, but the ADR that governs location leaving the phone says otherwise.
- Fix: either the countdown saves to the phone only and the upload waits for the next tap on the page, or ADR 0004 is updated to say an untouched form saves and sends after two minutes. The owner picks.
- Size: S
- Owner decides: yes

### contribute-08: The emulator ride proves the native log, not the recorder; the import after a kill has no unit test
- Severity: test
- Where: src/features/contribute/native/emulator-ride.ts:97-141; src/features/contribute/native/import-fix-log.ts:15-40; src/features/contribute/use-recording.ts:283-314, 371-404; tests/unit/native-fixes-test.mjs
- What happens: the CI ride runs its own copy of the recorder (`onFixes` writes rows itself), so `takeFixes`, the Stop that reads the log up to the tap and ends it, the auto-stop found on waking, and Resume after a Stop never run on a phone in CI. Only the page's load-time import is real. `importFixLog`'s two rules (a stopped ride takes nothing after its Stop; a running one is cut where it came back to its start) have no unit test. A regression in any of them passes CI; testers find it.
- Fix: unit-test `importFixLog` with a fake log and store (stopped, auto-stop, nothing new, another recording's log). Move the ride's per-fix logic into a small pure function that both `takeFixes` and the emulator driver call, so the CI ride exercises the real path.
- Size: M
- Owner decides: no

### contribute-09: The native fix log is read and rewritten whole, over and over, on long rides
- Severity: robustness
- Where: android/app/src/main/java/ph/para/contributor/FixLog.java:80-105, 111-130; src/features/contribute/native/native-location.ts:176-201, 234-238
- What happens: every read sends the whole ride's log over the Capacitor bridge: on every wake, and on every live fix after a 5-second silence (a tunnel, an underpass, a GPS hiccup). Four hours is about 14,000 lines, around 1 MB of JSON parsed on the WebView side each time; Stop rewrites the whole file. On a cheap phone late in a long ride this is a visible stall at the moments the contributor taps Stop or opens the screen. Nobody has seen it yet; the emulator ride is twenty minutes.
- Fix: give `read` an `after` time (the page knows its last fix) so Java returns only the newer lines, and keep the cut at Stop as is.
- Size: M
- Owner decides: no

### contribute-10: The contributor tables' row security is proved only by scripts no workflow runs
- Severity: test
- Where: supabase/verify/contributions.sh, contributor-accounts.sh, contribution-use.sh, signup-hook.sh; .github/workflows/ (none calls supabase/verify)
- What happens: what one contributor can read or delete of another's is the most important promise in this area. Its proofs exist and are good, but run only when a session remembers to run them by hand; a later migration that loosens a grant (as 05 would need) is not caught. Nobody notices until it is live.
- Fix: a CI job on changes under `supabase/` that starts the Postgres service and runs `supabase/verify/run.sh` and the contributor scripts.
- Size: M
- Owner decides: no

### contribute-11: Accounts are live, but the records and types still say they are not
- Severity: standard
- Where: supabase/migrations/README.md:36; src/shared/types/database.types.ts (no set_profile, get_profile, begin_claim, finish_claim); src/features/contribute/api/account.ts:85-87, 144-146; src/features/contribute/api/earlier-identity.ts:18; src/features/contribute/api/profile.ts:29; .env.production:17
- What happens: the live ledger has `contributor_accounts` at `20261024174511`, but the README says "not applied yet", the types were not regenerated, and four calls go through an untyped client with "TODO: once 01 is applied". A wrong argument name in `set_profile` or `finish_claim` would not be caught by `tsc`. `.env.production` still says uploads go "under consent version 2"; it is 3.
- Fix: regenerate the types, record the ledger version, drop the `untyped` workarounds and their TODOs, fix the comment.
- Size: S
- Owner decides: no

### contribute-12: The recorder and the upload queue are far past the 150-line limit, each with several jobs
- Severity: simplification
- Where: src/features/contribute/use-recording.ts (620 lines); src/features/contribute/use-uploads.ts (367); src/features/contribute/api/account.ts (287)
- What happens: `useRecording` holds the phases, fix writing and retrying, the native Stop, saving, downloads and the live totals; `useUploads` holds sending, retrying, removal, the editor-removal check and the person check. Bugs 01 and 08 sit in exactly these tangles. Every change touches the biggest file.
- Fix: split `useRecording` into fix writing (`useFixWrites`: pending, unwritten, flush), the native finish (`finish`/`settle`), and downloads; split `useUploads` into sending and the still-there check. After 01, the person-check code leaves `useUploads` entirely.
- Size: L
- Owner decides: no

### contribute-13: Dead code and a misplaced comment in the phone's store
- Severity: simplification
- Where: src/features/contribute/recording-store.ts:102-110
- What happens: `putFix` is used nowhere; the comment "The fixes of a recording, in the order they came." sits on `putFixes`, and `loadFixes` has none. A reader is misled about which function does what.
- Fix: delete `putFix`, move the comment to `loadFixes`.
- Size: S
- Owner decides: no

## What is good

- Fixes are written one by one as they arrive, and Save waits for every write to settle and retries the failed ones before the ride counts as saved (`use-recording.ts` `saveNow`): the model for anything that must not lose data.
- `save_contribution` is idempotent by the phone's own id, in one transaction, with the day cap checked before the insert so a resend never counts twice.
- The native fix log (FixLog.java plus the import on reopen) is a simple, well-reasoned answer to Android freezing the page, with a CI ride that kills the app.
- Column privileges rather than a view keep the phone number away from editors, and the apply files check their own grants before committing.
- The release workflow keeps the secret to one job, refuses an unsigned APK and checks the certificate fingerprint.

## Outside my area

- The live ledger has no `backup_reader` (20261022100000) and no `draft_update_own`; check whether the weekly backup can log in at all.
- `uploadsStillThere` (studio-adjacent): an editor signing in on the contributor page reads every contribution's id; harmless today, worth the same contributor filter its siblings have.
