# Para's privacy policy (draft)

> **A draft for the owner, not legal advice.** Every sentence is meant to be true of the code on `staging` on 2026-10-28. Have a lawyer read it before it goes public. Sources are cited at the end. Questions for the owner are in the pull request.

Last updated: (owner to fill, on publication)

## Who is responsible

Para is run by its owner, who decides what Para collects and why. Para is the "personal information controller" under the Philippines' Data Privacy Act of 2012 (Republic Act 10173).

To reach the owner about your data: (owner to fill). You can also message the owner on Facebook, through the link on the contributor page's consent screen.

## If you only use the map (commuters)

You can use the map at www.para-commute.org without an account.

- **Your location stays on your phone.** "Where am I" shows where you are on the map. The position is worked out on your phone and is never sent to Para or anyone else.
- **Para's map sends nothing about you.** The map reads files Para has published: the routes, and the map tiles. It doesn't send your searches or taps anywhere. There are no analytics or advertising trackers.
- **The offline copy.** To work without a signal, your phone keeps a copy of the app, the last published routes, the signboards, and the map tiles you've already seen. Your phone also remembers two choices: your fare type (regular or discounted) and your map style. All of this stays on your phone. Clearing the site's data in your browser removes it.
- **What the hosting sees.** Cloudflare hosts the site and the map tiles. Like any web host, it receives your internet (IP) address and your browser's details with each request it serves. Para doesn't read or keep those details (owner to confirm the Cloudflare log settings).

## If you record rides (contributors)

The contributor page (`/contribute/`) and the Para Contributor Android app let you record a ride and send it to Para. Nothing is recorded or sent until you agree to the consent screen.

**Your account.** Before you record, you make an account with your email, a password, your name and your mobile number. Supabase stores your password as a hash, never as typed.

**What a recording holds.** While you record, the page or app stores on your phone:

- your phone's location about once a second, with its accuracy and speed;
- the times, and the gaps when there was no signal;
- each time the ride stood still (a "hinto");
- what you type: the start and end names, a description, and the vehicle.

In the Android app, recording continues with the screen off and shows a "Para is recording" notification.

**When it's sent.** A recording stays only on your phone until you tap Save. Then it's sent to Para. If there's no signal, it waits on your phone and is sent later. A short bot check by Cloudflare Turnstile runs before your first save.

**What it's used for.** Drawing and checking routes and hintuans, studying how people ride, and machine learning.

**Who sees it.**

- Para's editors see your rides and your name, in the studio.
- Only the owner sees your email and number, to contact you.
- Your rides are never public, and never live: nobody watches you move.

**Where it's kept.**

- Supabase's servers in Singapore.
- A private, encrypted weekly backup at Cloudflare R2. Only the owner holds the key that opens it.

**How long.**

- **The exact points:** kept 24 months. After that, only the cleaned line, the times, the totals, the hintos and the vehicle are kept. The line is cut short by 200 metres at each end, and hintos near the ends are removed. The start and end names and the description are cleared. What remains is no longer tied to you.
- **Your account:** stays until you ask the owner to delete it.
- **Backups:** kept 60 days.

**Deleting.**

- **One ride:** in History, choose "Remove upload". This deletes it from Para, with its points and hintos, on any phone you're signed in on. "Delete from phone" removes only your phone's copy.
- **Your account:** ask the owner.
- **Backups:** a deleted ride can remain in a backup until that backup is deleted, at most 60 days later.

**Limits.** Para accepts at most 20 rides from one account in 24 hours. Editors can hide a ride, or block an account from sending more.

## If you edit routes (editors)

Editors sign in to the studio (`/studio/`) with an email and password. Cloudflare Turnstile checks sign-in, Forgot password and Change password.

What Para records:

- whether your account is an editor;
- the name shown to other editors (for example, "being changed by …");
- your account on the drafts you make, submit, approve or send back;
- on rides you hide, accounts you block, and rides you use for a route.

When you draw in the studio, your browser also contacts:

- the public OSRM router, to snap lines to the road;
- Esri and Amazon Web Services, for the Satellite and Terrain map styles.

## Who else handles your data

| Service | What for | What it receives |
| --- | --- | --- |
| Cloudflare | Hosting the site and the map tiles; the bot check (Turnstile); the encrypted backup (R2) | Every visitor's requests, as any host does. Turnstile: browser signals during the check. R2: the encrypted backup only |
| Supabase | The database and sign-in | Contributors' and editors' accounts and what they save |
| Resend | Sending password-reset email | Your email address, and the reset code |
| GitHub | Hosting the Android app's download and its update check | The download request, and the app's check for a newer version |
| OpenStreetMap | The map's streets and places | Nothing from you. Para builds its map from OpenStreetMap's data, © OpenStreetMap contributors |

Para doesn't sell your data or share it with advertisers.

## Your rights

Under the Data Privacy Act you have the right:

- to be informed;
- to access your data and get a copy;
- to correct it;
- to object to its processing;
- to have it erased or blocked;
- to data portability;
- to claim damages.

You can also complain to the National Privacy Commission.

To use any of these rights, contact the owner (above).

Some things you can do yourself:

- correct your name and number in Profile;
- download a ride ("Download");
- remove a ride ("Remove upload").

## Changes to this policy

When this policy changes, the date at the top changes. If what the contributor page records or shares changes, the consent screen asks you again before anything more is sent.

<!--
Sources, claim by claim (for the owner and the lawyer; remove before publishing):

Who's responsible
- Facebook contact: src/features/contribute/consent-panel.tsx (OWNER_PAGE, "Who is responsible").

Commuters
- Location stays on the phone: docs/adr/0004-location-leaves-the-phone-only-by-choice.md; README.md ("the position never leaves the phone").
- The map reads only published files, no database: docs/adr/0001-visitors-read-a-published-file.md; scripts/checks/check-build.mjs (no database client on /).
- No analytics: none in src/, index.html (grep for analytics, gtag, plausible, sentry, posthog: nothing).
- Offline copy: scripts/node/offline-worker-caches.ts (map-file, map-lines, signboards, basemap-meta, basemap-tiles); fare kind src/features/routes/cards/use-fare-kind.ts (para.fare.v1); map style src/features/routes/map/basemap.ts (para.basemap.v1).
- Cloudflare hosts the site and tiles: wrangler.jsonc, workers/tiles/wrangler.jsonc, docs/adr/0007-para-serves-its-own-basemap.md, .scratch/custom-domain/issues/05-switch-and-retire.md.

Contributors
- Consent before anything: src/features/contribute/consent-panel.tsx; CONSENT_VERSION 3 in src/features/contribute/consent-version.ts.
- Android app, screen off, notification: docs/adr/0006-the-contributor-app-is-a-capacitor-android-app.md.
- Account with email, password, name, number, required before recording: src/features/contribute/account/account-fields.ts, use-account-gate.ts; supabase/migrations/20261024090000_contributor_accounts.sql (name, phone; email stays in auth.users). Password hashing: Supabase Auth (account-fields.ts comment, bcrypt).
- What a recording holds: supabase/migrations/20261019125900_contributions.sql (contribution, point_batch with dt_ms, dlat, dlng, accuracy_m, speed_cms, hinto); src/features/contribute/save-form.tsx (start, end, description, vehicle).
- Stays on the phone until Save, waits without signal: consent-panel.tsx; src/features/contribute/recording-store.ts (IndexedDB para-contribute); src/features/contribute/use-uploads.ts.
- Turnstile before the first save: src/features/contribute/api/upload-contribution.ts; .claude/CLAUDE.md (Stack).
- Purpose, who sees, where, how long, deleting: consent-panel.tsx.
- Editors see name, never number: 20261024090000_contributor_accounts.sql (column privileges).
- 24 months, then what is kept and what is cleared, 200 m: supabase/migrations/20261022090000_contribution_use.sql (header, private.retire_month); ADR 0004.
- Backup: .github/workflows/backup.yml (weekly, encrypted to the owner's key, R2, 60-day lifecycle rule in its setup step 1); .github/backup/README.md.
- Remove upload and Delete from phone: src/features/contribute/ride-actions.tsx; points and hintos cascade: 20261019125900_contributions.sql (on delete cascade).
- 20 a day, hiding, blocking: 20261019125900_contributions.sql (day_cap, hidden_at); 20261022090000_contribution_use.sql (block_contributor).

Editors
- Email and password sign-in, Turnstile: .env.production comment (sign-in, Forgot password, Change password).
- Editor list, names, drafts: supabase/migrations/0005_editor_role.sql (private.editor), 0018_review.sql (editor_name, draft); hidden_by, blocked_by, contribution_use.editor_id in the contribution migrations.
- OSRM, Esri, AWS: src/features/studio (router.project-osrm.org; server.arcgisonline.com and elevation-tiles-prod.s3.amazonaws.com in studio-basemaps.ts).

Third parties
- Resend for reset email: .scratch/custom-domain/issues/01-site-on-para-and-inventory.md (resend._domainkey, send records); the hub's check of 2026-10-28.
- GitHub release and update check: .env.apk (VITE_APP_LATEST_URL); ADR 0006.
- OpenStreetMap data and credit: ADR 0007 (Credits); .github/workflows/tiles.yml (Geofabrik extract).

Rights: Republic Act 10173, sections 16 to 18 (rights of the data subject, data portability). Profile and Download: src/features/contribute/account/profile-form.tsx, ride-actions.tsx.
Changes: consent-version.ts (an older consent no longer counts; the screen asks again).
-->
