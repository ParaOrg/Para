# Operations

How Para runs day to day: where each piece lives, what it costs, what renews when, what to do when something breaks, how to restore a backup, and how to keep the accounts safe.

Written 2026-10-28 from the repo and from what the hub checked live that day. Anything the repo could not confirm says **(owner to confirm)**. No secret value is written here: only the place a secret is kept.

## Where everything lives

| Service and account | What Para keeps there | Who signs in | Where its keys and secrets are kept |
| --- | --- | --- | --- |
| **GitHub**, organisation `ParaOrg`, repository `Para` (public) | The code; the published map in `public/data/`, committed by the nightly publish when the map changes; the workflows; the contributor app's releases (`para-contributor.apk` and `latest.json` on GitHub Releases, ADR 0006); the backup's public key (`.github/backup/owner-public-key.asc`); the encrypted app signing key (`android/release-key.p12.enc`) | The owner (admin) (owner to confirm: any other member) | Repository secrets: `PUBLISH_DEPLOY_KEY` (publish-map.yml), `BACKUP_DATABASE_URL`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (backup.yml). Environment `tiles`: `TILES_R2_ENDPOINT`, `TILES_R2_ACCESS_KEY_ID`, `TILES_R2_SECRET_ACCESS_KEY`, `TILES_R2_BUCKET` (tiles.yml). Environment `app-release`: `PARAPO_KEY_PASSPHRASE` (contributor-app.yml, make-app-signing-key.yml). The deploy key "Nightly publish" (Settings → Deploy keys, `docs/agents/main-protection.md`) |
| **Cloudflare, the Para account** | The zone `para-commute.org` (Free plan). The `para` Worker: the site from `dist/` (`wrangler.jsonc`), built by Workers Builds from GitHub, production branch `main`, a preview per branch. The `para-tiles` Worker (`workers/tiles/wrangler.jsonc`). The R2 bucket `parapo-tiles` (the tiles, styles, sprite and glyphs). The backup's R2 bucket (its name is the secret `R2_BUCKET`) | The owner | R2 API tokens, one per bucket (backup.yml and tiles.yml headers); their values are only in the GitHub secrets above. Workers Builds reaches GitHub through Cloudflare's GitHub App |
| **Cloudflare, the old Villaralvorovic2 account** | The Turnstile widget (its site key is in `.env.production` and `.env.apk`), and the old `parapo` Worker | The owner | Turnstile's secret key is in Supabase's Auth settings, never in the repo |
| **Supabase**, project in Singapore (the consent screen, `consent-panel.tsx`) | The database: the route tables, drafts and review, the contributors and their rides; Auth (editors, contributors, anonymous phones); the public Storage bucket `signboards` (`features/studio/data/signboards.ts`) | The owner (owner to confirm: any other dashboard member) | The project URL and publishable key are public (`.env.production`). The `backup_reader` role's password is only inside the secret `BACKUP_DATABASE_URL`. The service and database passwords: the owner's password manager (owner to confirm) |
| **Namecheap** | The registration of `para-commute.org`. Nameservers point at Cloudflare | The owner | The owner's password manager (owner to confirm) |
| **Resend** | Sends the password-reset email, as Supabase Auth's SMTP. Its DKIM record (`resend._domainkey`) and the `send` MX and TXT records are in Cloudflare DNS | The owner | Its API key is in Supabase's SMTP settings (owner to confirm) |
| **The owner's own computer and password manager** | The backup's private GPG key (never on GitHub, R2 or Supabase); the app key passphrase; recovery codes | The owner | Password manager and an offline copy (backup.yml step 3) |
| **Facebook** | The page the consent screen links as the way to reach the owner (`consent-panel.tsx`) | The owner | (owner to confirm) |
| **The privacy policy** | Para's privacy policy, a document the owner holds; not in the repo | The owner | – |
| **Services Para uses without an account** | OpenStreetMap data through Geofabrik's extract and Planetiler (tiles.yml); OpenFreeMap's styles, sprite and glyphs, copied monthly (`scripts/tiles/fetch-assets.mjs`); the public OSRM demo router for the studio's snapping; Esri and AWS's elevation tiles for the studio's Satellite and Terrain designs (`studio-basemaps.ts`) | – | – |
| **Google Play and Apple** | Nothing yet. The commuter app is planned for both stores (ADR 0008); the contributor app is a direct download (ADR 0006) | – | – |

The addresses (checked live 2026-10-28):

- `www.para-commute.org`: the `para` Worker, through a Workers route on the zone.
- `tiles.para-commute.org`: the `para-tiles` Worker, through a Workers route.
- `para-commute.org`: a redirect rule to `www`, 301, with Always Use HTTPS on.
- Staging: `staging-para.para-ph-info.workers.dev` is meant to be the `para` Worker's preview of `staging`, but on 2026-10-28 it answered Cloudflare's 404 for `/` and `/data/index.v5.json`, likely (not proven) because its builds fail (the "Workers Builds: para" check, ticket ready-for-100k 07). The staging address that works today is the old account's `staging-parapo.villaralvorovic2.workers.dev` (owner to confirm when the new one takes over).

## Costs and limits

| Service | Plan | Free allowance, and what happens at the limit | Source and date |
| --- | --- | --- | --- |
| Cloudflare Workers | Free (owner to confirm; ticket ready-for-100k 07 moves it to Paid) | Free: 100,000 requests a day across the account's Workers, 10 ms CPU a request; past the daily cap a Worker answers with an error until the next day. Paid: $5 a month, 10 million requests a month included, then $0.30 a million. Static assets (the site's `dist/`) are free and unlimited on both, so the cap lands on the tiles Worker | Cloudflare's Workers pricing page, read by the hub the week of 2026-10-28 |
| Cloudflare R2 | Free allowance | 10 GB-month storage, 1 million Class A (writes) and 10 million Class B (reads) a month, egress free. Past it: $0.015 a GB-month, $4.50 a million Class A, $0.36 a million Class B. Each tile on a cache miss is a Class B read | developers.cloudflare.com/r2/pricing, last updated 2026-10-26, read 2026-10-28 |
| Cloudflare zone, Turnstile | Free | DNS, the redirect rule and Workers routes are on the Free plan (the zone is Free and they run today). Turnstile is free (owner to confirm the widget's plan) | The zone's plan, `.scratch/custom-domain/issues/02` |
| Supabase | Free (backup.yml and publish-map.yml call it "Free Supabase"; owner to confirm in ticket ready-for-100k 01) | 500 MB database (then read-only: writes fail), 50,000 monthly active users, 5 GB egress, 1 GB Storage. A Free project with too little activity in 7 days is paused; the nightly publish counts as activity. No downloadable backups, hence the R2 backup | supabase.com/docs, "About billing on Supabase", "Database size" and "Project pausing", read 2026-10-28 |
| GitHub | Free organisation, public repository (owner to confirm) | Actions minutes on standard runners are free for a public repository (owner to confirm). Scheduled workflows stop after 60 days without activity in a public repository; GitHub emails first and one click turns them back on (publish-map.yml header) | GitHub's docs, from the workflow header; (owner to confirm the plan) |
| Namecheap | `para-commute.org`, auto-renew on | Renewal price (owner to confirm) | The owner's screenshot, `.scratch/custom-domain/issues/01` |
| Resend | (owner to confirm the plan) | (owner to confirm the free allowance; at its limit password-reset email stops sending) | – |

## Renewals and dates

| What | When | What to do |
| --- | --- | --- |
| The domain `para-commute.org` at Namecheap | **2026-12-23** | Auto-renew is on (`.scratch/custom-domain/issues/01`). Check the card on file a month before |
| HTTPS certificates | Automatic | Cloudflare issues and renews the edge certificates for the zone. Nothing to do; the CAA records allow its authorities |
| The backup's GPG key | **2029-10-28** | Make a new pair and replace `.github/backup/owner-public-key.asc` before then, or the backup stops (`.github/backup/README.md`). Old backups still open with the old private key |
| The app signing key | About 2056 (10,950 days from 2026-10-25) | Never replaced: a new key means testers uninstall (make-app-signing-key.yml) |
| R2 API tokens, the deploy key | No expiry set in the repo (owner to confirm each token's TTL in Cloudflare) | Rotate if leaked: make a new one, update its GitHub secret, delete the old one |
| Supabase monthly pieces of `point_batch` | Made to the end of 2028 | Once a year, `select private.add_months(12);`, then `select private.grant_backup_reader();` (backup.yml step 4) |
| Retiring old ride points | Monthly from November 2028 | `select private.retire_month(...)`, the migration `20261022090000_contribution_use.sql`'s header |
| GitHub's 60-day schedule rule | 60 days after the last commit | Re-enable from GitHub's email, or ticket ready-for-100k 04's fix |

## Runbooks

Each says what you'd see, the first check, and the fix. When the alert workflow (ticket ready-for-100k 04) lands, its issues carry the label `alert` and link the section here: [open alerts](https://github.com/ParaOrg/Para/issues?q=is%3Aissue+is%3Aopen+label%3Aalert). The alert issues link to these sections by their headings, so rename a heading only together with its link in `scripts/watch/`.

### The map is blank

- **You'd see:** `www.para-commute.org` loads with no map, or no page at all.
- **First check:** the `para` Worker in Cloudflare (Workers & Pages → `para` → Deployments): did the last deploy fail? Then open `https://www.para-commute.org/data/index.v5.json`: JSON, or the page's HTML?
- **Fix:** a bad deploy: roll back to the previous version under Deployments. A missing or broken index: see "A publish failed". A Workers route gone: the zone's Workers Routes must list `www.para-commute.org/*` → `para`.

### The street map is blank but routes show (the tiles)

- **You'd see:** the routes and hotspots, on an empty background.
- **First check:** `https://tiles.para-commute.org/health` (`workers/tiles/README.md`). A `503` means no `tiles/current.json` in the bucket. An error page or `429` means the daily cap or the rate rule.
- **Fix:** the Workers Free cap: wait for the next day, or move to Workers Paid (ticket 07). A broken build: see "The tiles build failed". In an emergency, go back to OpenFreeMap: remove `VITE_BASEMAP_HOST` from `.env.production` and release (ADR 0007).

### The published map is stale

- **You'd see:** an approved change isn't on the map the next day; the map shows "Not refreshed" (`features/published-map/notices.tsx`).
- **First check:** `published_at` in `https://www.para-commute.org/data/index.v5.json`, then the Publish map runs in GitHub Actions and the open issue "The map needs a look".
- **Fix:** if the schedule was turned off (60 days without commits), turn it back on in Actions. If runs fail, see "A publish failed". If runs pass with "The map is unchanged", the change was not approved yet (ADR 0003).

### A publish failed

- **You'd see:** the issue "The map needs a look", opened by `publish-map.yml`, with the run's log.
- **First check:** the issue's log. `PUBLISH_DEPLOY_KEY is not set`, a permission error on the push, a shrink of more than 30%, a data problem from `check-map-data.mjs`, or the database unreachable.
- **Fix:** a missing or wrong key: `docs/agents/main-protection.md`. A shrink that is deliberate: Run workflow with Force ticked. A data problem: fix the route in the studio, then Run workflow. Supabase down: see below; the live map keeps the last published file meanwhile (ADR 0001).

### A backup failed

- **You'd see:** a red Backup run in Actions, and GitHub's email about a failed scheduled run.
- **First check:** the run's `::error::` line (backup.yml). A missing public key or secret names itself; a refused login points at `BACKUP_DATABASE_URL` or the role; "only N bytes" means the dump failed.
- **Fix:** a new monthly piece the role can't read: `select private.grant_backup_reader();`. A changed password: update the secret. Then Run workflow once. A backup missing for more than a week is worth fixing the same day: rides can't be recorded again.

### The tiles build failed

- **You'd see:** a red Tiles run (monthly, 18:00 UTC on the 3rd, which is 02:00 Manila on the 4th), and GitHub's email.
- **First check:** the run's `::error::` line (tiles.yml): a secret missing from the `tiles` environment, an endpoint not in R2's shape, the area check, or Planetiler's download.
- **Fix:** the live tiles keep serving the last good build (`tiles/current.json` only moves on a checked upload), so there is no rush. Fix the cause, then Run workflow with upload ticked, from `main`.

### A sign-in or Turnstile error

- **You'd see:** the studio's sign-in, Forgot password, or a contributor's first save fails with a bot-check error, or a reset email never arrives.
- **First check:** in the old Villaralvorovic2 Cloudflare account, Turnstile → the widget's hostnames must include `www.para-commute.org` and `para-commute.org`. In Supabase → Authentication → URL Configuration, the Site URL is `https://www.para-commute.org` and `https://www.para-commute.org/**` is a redirect URL. For email: Supabase's Auth logs, then Resend's dashboard.
- **Fix:** add the missing hostname or URL. If the Turnstile secret was rotated, the new one goes in Supabase's Auth settings. If Resend's records were lost, restore `resend._domainkey` and the `send` records in Cloudflare DNS from Resend's domain page.

### The domain or HTTPS is wrong

- **You'd see:** a browser certificate warning, `para-commute.org` not reaching `www`, or the old Vercel app.
- **First check:** Cloudflare → `para-commute.org` → Overview: Active, nameservers `kianchau` and `lovisa`. Then DNS: proxied AAAA `www`, `tiles` and `@` to `100::`. Then Rules: the redirect. SSL/TLS: Always Use HTTPS on.
- **Fix:** if the zone isn't Active, check Namecheap's nameservers and the domain's expiry. Put back any missing record or route as `.scratch/custom-domain/issues/05` lists them.

### Supabase is down

- **You'd see:** the studio can't load or save; contributors' saves wait; the publish fails.
- **First check:** status.supabase.com, then the project's dashboard: is it paused, or read-only past 500 MB?
- **Fix:** commuters are not affected: the public map reads only the published file (ADR 0001). A paused project: Resume (within 90 days). Read-only: free space or upgrade (ticket 01). Contributors' saved rides wait on their phones and are sent again when it answers (`features/contribute/use-uploads.ts`). If the project is lost, restore from the latest backup (below) into a new project (owner to confirm the steps then: the backup holds no `auth.users`, so accounts would be made again).

## The restore rehearsal

For the owner, on their own computer, once at launch and once a year. Only the owner holds the private key, so no session runs this. It follows backup.yml's header; note how long each step takes.

1. **Get the newest backup.** Cloudflare (Para account) → R2 → the backup bucket → download the newest `parapo-<date>.sql.gz.gpg`. Or with the AWS CLI and the R2 values: `aws s3 cp --endpoint-url "$R2_ENDPOINT" s3://<bucket>/parapo-<date>.sql.gz.gpg .`
2. **Decrypt and unpack.** With the private key imported (`gpg --import` from your password manager's copy): `gpg --decrypt parapo-<date>.sql.gz.gpg | gunzip > para.sql`. gpg asks for the key's passphrase.
3. **Start a scratch Postgres 17:** `docker run --rm -d --name para-restore -e POSTGRES_PASSWORD=x -p 5433:5432 postgres:17`
4. **Stand in for what the dump expects, then load it:**

   ```sh
   export PGPASSWORD=x
   psql -h localhost -p 5433 -U postgres -c 'create database para'
   psql -h localhost -p 5433 -U postgres -d para <<'SQL'
   create schema auth;
   create table auth.users (id uuid primary key);
   create function auth.uid() returns uuid language sql as 'select null::uuid';
   create role anon; create role authenticated;
   SQL
   psql -h localhost -p 5433 -U postgres -d para -f para.sql
   ```

   Row security policies and triggers that call Supabase's own functions fail to create. That is expected: the tables and every row still load.
5. **Compare** with the backup run's log, which prints the counts: `select count(*) from public.contribution;`, and the same for `contributor`, `route`, `route_variant`, `stop`, `route_stop`; `select sum(point_count) from public.point_batch;`.
6. **Clean up:** `docker stop para-restore` and delete `para.sql`. It is plain text, with people's rides in it.
7. **Write down** the date, the backup's name, how long it took and any step that didn't work, under ticket ready-for-100k 05's Comments.

## Account safety checklist

Tick each once, and look again each year.

- [ ] Two-factor sign-in on GitHub, Cloudflare (the Para account and the Villaralvorovic2 account), Supabase, Namecheap, Resend, Facebook, and any Google account the others sign in with (owner to confirm which).
- [ ] Each service's recovery codes stored offline, apart from the password manager.
- [ ] The backup's private GPG key and the app key passphrase in the password manager and on an offline copy. Without the first every backup is unreadable; without the second the contributor app can't be updated.
- [ ] Namecheap's registrar lock on, and auto-renew on with a card that won't expire before 2026-12-23.
- [ ] A second trusted person who can reach these accounts if the owner can't (owner to decide who, and how: a shared vault, or an invitation as admin on each service).
- [ ] The old Villaralvorovic2 Cloudflare account: move the Turnstile widget to the Para account (a new widget means a new site key in `.env.production` and `.env.apk`, and its secret in Supabase), then delete the old `parapo` Worker. Until then, keep two-factor on that account too.
- [ ] GitHub: only "Nightly publish" has a deploy key with write access (`docs/agents/main-protection.md`).
- [ ] DNSSEC on (ticket 07): Cloudflare → DNS → Settings, then the DS record at Namecheap. Off today.
- [ ] The privacy policy, which the owner holds, still matches what Para collects and where it keeps it, whenever a service in the table above changes.
