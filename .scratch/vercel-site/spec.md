Paused 2026-11-27: the owner chose GitHub Actions → Cloudflare

# The site moves to Vercel

Written 2026-11-27 for the owner's decision of the same day. Plan only: nothing here has been created, linked or pointed anywhere yet.

## Why

- Cloudflare's free plan ran out of its 3,000 build minutes for November. Workers Builds is paused until 1 December, so no PR gets a preview and `main` does not deploy.
- The owner wants no limit on PR previews. On the owner's Vercel Pro plan every PR gets a preview link of its own.

## What moves and what stays

| Piece | Today | After |
| --- | --- | --- |
| The site: `/` (the public map), `/studio/`, `/contribute/`, `/app/`, `/coming-soon/`, `/data/*` (the published map) | Worker `para`, Cloudflare (`wrangler.jsonc`, `workers/site/`) | A Vercel project, `para`, on the owner's Pro team |
| `/api/report` (a commuter's route report) | The same Worker (`workers/site/src/report.ts`) | A Vercel Function, `api/report.ts` |
| Tiles, styles, sprite, glyphs: `tiles.para-commute.org` | Worker `para-tiles`, R2 `parapo-tiles` (ADR 0007) | **Stays.** Tile traffic is free on Cloudflare and would be billed on Vercel past 1 TB |
| The weekly encrypted backup | R2 (`backup.yml`) | **Stays** |
| Turnstile (the bot check) | The widget in the old Villaralvorovic2 account | **Stays.** Its secret moves from the Worker's secrets to Vercel's |
| DNS for `para-commute.org` | The Cloudflare zone (Para account) | **Stays** at Cloudflare. Only the `www` record changes, last |
| The bare domain's 301 to `www` | A Cloudflare redirect rule | **Stays** |
| The contributor app (APK) | Its own files on the phone, `https://localhost` | Unchanged. It reads `https://www.para-commute.org/data/*` through the phone's HTTP client (`published-source.ts`), so `www` must keep serving `/data/` through the switch |

## 1. What the `para` Worker does today, and its Vercel equivalent

| Today (`wrangler.jsonc`, `workers/site/src/*`) | On Vercel | Ticket |
| --- | --- | --- |
| `assets.directory: ./dist`: serves the build | Output directory `dist`, framework preset "Other" (or Vite), build command `npm run build:vercel` (below) | 02 |
| `not_found_handling: single-page-application`: any address with no file answers `/index.html`, 200. The code relies on it: a missing `/data/` file answers the map's page, and the readers treat that as "not there" (`fetch-index.ts`, `contribute-sw.ts`, `public-worker.mjs`) | `vercel.json` `rewrites`: `{ "source": "/(.*)", "destination": "/index.html" }`. Vercel checks the filesystem before rewrites, so real files are served first, exactly as now | 02 |
| `html_handling: auto-trailing-slash`: `/studio` → `/studio/`, `/index.html` → `/` | Explicit `redirects` in `vercel.json` for `/index.html`, `/studio`, `/contribute`, `/app`, `/coming-soon` (308), not `trailingSlash: true`, which would also rewrite every SPA address. The preview check lists what the Worker answered for each | 02 |
| `public/.assetsignore` keeps `dist/.vite/` unserved | Vercel has no ignore file for the output. The build script deletes `dist/.vite/` (and `dist/_headers`, `dist/.assetsignore`) **after** `check-build.mjs` has read them | 02 |
| `public/_headers`: cache rules (`/assets/*` immutable, signboards immutable), security headers on `/*`, one report-only content policy per page, `noindex` and frame rules on `/studio/*`, `/contribute/*`, `/coming-soon/*` | `vercel.json` `headers`, the same rules in the same order. Vercel's default for static files is `public, max-age=0, must-revalidate`, the same default Cloudflare sends, so `/data/*`, `index.html`, `sw.js` and the manifest keep being re-checked on every visit. Two semantics differ and must be checked: Cloudflare joins a header two rules set; Vercel's later rule wins. The `_headers` file is written so no header appears in two matching rules, so the result is the same; the guard proves it | 03 |
| `run_worker_first` on every page address except `/assets/*`, `/data/*`, `/icons/*`, `/studio/*`, `/contribute/*`, `/coming-soon/*`, `/app/fonts/*` | Routing Middleware, `middleware.ts` at the root, with a `matcher` of the same page addresses, so it never runs for files | 04 |
| `coming-soon.ts`: on the production hosts, any HTML page but `/studio/`, `/contribute/`, `/coming-soon/` is answered with Coming soon, 200, at the same address | The middleware rewrites those pages to `/coming-soon/` when the deployment is production (`VERCEL_ENV === 'production'`), which covers `www`, the bare domain's target and the project's own production `*.vercel.app` alias. Every preview and the staging branch keep the map. A rewrite in `vercel.json` cannot do this: `/` is a real file, and files win over rewrites. The Worker looked at the answer's `content-type`; the middleware cannot, so a "page" is an address whose last part has no file extension, or ends `.html`. The unit tests of `coming-soon.ts` carry over | 04 |
| `retiring-worker.ts`: `/sw.js` on production is the worker that removes the installed map | The middleware answers `/sw.js` on production with the same `retiringWorkerResponse()` | 04 |
| `/api/*` other than `/api/report` → 404 JSON | `api/report.ts` is the only function; Vercel answers other `/api/*` 404. The SPA rewrite must exclude `/api/` so a typo is not the map's page: `"source": "/((?!api/).*)"` | 02, 05 |
| `/api/report`: method, rate limit, size, schema, Turnstile, database (`report.ts`, `turnstile.ts`, `submit.ts`) | A Vercel Function in the Node runtime (the `postgres` driver needs TCP sockets), `api/report.ts`, exporting `POST(request: Request)`, calling the same `handleReport`. `ctx.waitUntil(sql.end())` becomes an awaited `sql.end()` in `finally`, a few milliseconds, no new package | 05 |
| `REPORT_LIMIT`: Cloudflare's rate-limit binding, 5 reports a minute per sender, the address kept in memory only | **Recommended:** a Vercel Firewall rate-limit rule, set by the owner in the dashboard: path `/api/report`, 5 requests per 60 s per IP, action deny (429). No code, no package, no new service. The function's `isAllowed` becomes `() => true` and the database's own caps (`busy`, `route_full`, `full`) stay behind it. If Pro bills the rule beyond what the owner accepts (`vercel pricing firewall`), the fallback is an in-memory limiter per function instance, which Fluid compute shares between requests, weaker but free; Turnstile and the database caps still hold. Rejected: a table of senders in Supabase (it would store the address, which the report promises never to do: `workers/site/README.md`), Upstash or KV (a new paid service) | 05, 07 |
| Secrets `REPORT_DATABASE_URL`, `TURNSTILE_SECRET_KEY`, set in the Cloudflare dashboard | Vercel → Project → Settings → Environment Variables, type **Sensitive**, **Production only**. Previews answer `unavailable` (503), as an unset Worker does, so a branch's unreviewed code never holds the database's password | 07 |
| `nodejs_compat`, `compatibility_date` | Not needed: Vercel Functions run Node | 05 |
| `workers_dev`, `preview_urls`, `previews: {}` | Vercel's Git integration: production branch `main`, a preview for every other branch and PR, and a branch domain for `staging` | 07 |

## 2. Every place that assumes Cloudflare for the site

| Place | What it assumes | Change | Ticket |
| --- | --- | --- | --- |
| `src/shared/config/env.ts`, `isLiveDataPreview` | A preview's host ends `.workers.dev` | Ends `.vercel.app`, or is `staging.para-commute.org`. Keep `.workers.dev` until 11 retires the Worker. `tests/unit/live-data-preview-test.mjs` follows | 06 |
| `workers/site/src/coming-soon.ts`, `isComingSoonHost` | `para.<account>.workers.dev` is production | Kept unchanged for the Worker (the rollback path). The middleware decides by `VERCEL_ENV` instead | 04 |
| `scripts/checks/check-build.mjs` and `build/*.mjs` | Reads `dist/_headers` (`content-policy.mjs`); the precache checks exclude `_headers`; comments name `wrangler.jsonc` | The policy guard reads the headers from `vercel.json` through the same `headers-file.ts`, taught Vercel's `source` syntax. The precache rules stay as they are (excluding a file that no longer exists is harmless). The guards and the budgets (`weight.mjs`) are unchanged: Vercel runs the same `npm run build`, so a guard that fails stops the deploy, as on Cloudflare | 02, 03 |
| `scripts/node/headers-file.ts`, `vite-plugins/preview-policies.ts`, `tests/unit/headers-file-test.mjs` | Cloudflare's `_headers` syntax | Read `vercel.json`'s `headers` array. `vite preview` keeps sending the same policies, so the suites see what the site sends | 03 |
| `public/_headers`, `public/.assetsignore` | Cloudflare reads them from `dist/` | `_headers` moves into `vercel.json` (03). Both stay in the build until 11 so a rollback deploy of the Worker still has them; the Vercel build deletes them from what it serves | 02, 03, 11 |
| `.github/workflows/ci.yml` | Nothing deploys from CI (Cloudflare's GitHub App does). No step names `workers.dev` | No change. Vercel's GitHub App adds its own check and a comment with the preview link. Not a required check at first. `npm run typecheck` keeps `tsc -p workers/site` until 11 | – |
| `scripts/watch/watch.mjs`, `checks.mjs` | Hints say "the Cloudflare dashboard, Workers & Pages, para" | Hints name Vercel → para → Deployments. `SITE` stays `https://www.para-commute.org` | 11 |
| `scripts/research/load-test.mjs` | `DEFAULT_SITE` is `staging-para.para-ph-info.workers.dev` | `https://staging.para-commute.org` | 06 |
| `tests/e2e/retire-pwa-test.mjs`, `report-stand-in.mjs`, `tests/unit/*-worker-test.mjs` | Import `workers/site/src/*` | Unchanged: the code stays where it is, imported by the middleware and the function, until 11 moves it | – |
| `.env.production` | "Cloudflare's build has no env vars" | True of Vercel's build too for `VITE_` values: they stay committed, public, one source. Vercel adds `VERCEL_*` system variables, which Vite never bakes in (no `VITE_` prefix). Only the comment changes | 11 |
| Supabase Auth → URL Configuration | Site URL `https://www.para-commute.org`, redirect `https://www.para-commute.org/**` | Unchanged for production. Add `https://staging.para-commute.org/**`. No `*.vercel.app` redirect: branch previews are not for signing in (`docs/operations.md`, Branch previews) | 08 |
| Turnstile widget hostnames | `www.para-commute.org`, `para-commute.org` (custom-domain 05) | A hostname covers its subdomains, so `staging.para-commute.org` passes once `para-commute.org` is listed (owner to confirm the list). No `vercel.app`: same reason as above. The studio's sign-in on a branch preview then fails the bot check, which is the rule already | 08 |
| `workers/tiles/src/cors.ts` | The tiles answer CORS only for `www`, the bare domain, localhost and the site's `workers.dev` addresses | Add `staging.para-commute.org` and this project's own `*.vercel.app` pattern (team slug from 07), or every Vercel preview has a blank basemap. A tiles Worker change: deployed by its own build or by the owner with `wrangler deploy` | 12 |
| The waitlist Edge Function (`supabase/functions/waitlist`) | Answers `Access-Control-Allow-Origin: *` | No change | – |
| The PWA (`scripts/node/offline-worker.ts`, scope `/`; `/contribute/sw.js`, scope `/contribute/`) | Same origin, root scope | No change: the origin `https://www.para-commute.org` stays, so installed apps keep their worker and stores. `sw.js` must keep `max-age=0` (03) | 03 |
| The contributor app | Reads `https://www.para-commute.org/data/*` natively | No change. Vercel's Deployment Protection never applies to a custom domain; the Firewall's bot rules, if the owner turns any on, must not challenge `/data/*` | 07 |
| `docs/operations.md`, `README.md`, `docs/system-design.md`, `docs/agents/how-we-work.md` (preview address rule), `workers/site/README.md`, `SECURITY.md`, ADR 0007's "Cloudflare's build has no environment variables" | Name Cloudflare as the site's host and `<branch>-para…workers.dev` as previews | Rewritten for Vercel (11); ADR 0007 gets an amendment line | 11 |
| `scripts/preview/` (a Cloudflare direct-upload sample) | Cloudflare's assets API | Left for `/tidy` after 11 | – |

## 3. Builds

- **Install:** `npm ci` (Vercel's default with a lockfile). No `postinstall` runs anything Cloudflare-specific.
- **Build command:** a new script, `"build:vercel": "npm run build && node scripts/vercel/strip-dist.mjs"`. `npm run build` is the same one CI and Cloudflare run: typecheck, Vite, and every guard and budget in `check-build.mjs`. `strip-dist.mjs` then deletes `dist/.vite/`, `dist/_headers` and `dist/.assetsignore`, which only the guards and Cloudflare read. The guards stay identical because they are literally the same command.
- **Output directory:** `dist`. **Root directory:** the repo root (so `api/` and `middleware.ts` are found).
- **Node:** 22.x, set in the project's settings, the same as CI's `node-version: 22`. `engines` says `>=22.12`, which Vercel would read as "the newest", so the setting is explicit.
- **Env vars on Vercel:** none for the build. The public `VITE_` values come from the committed `.env.production`, as now. The only two variables are the function's secrets (above), production only.
- **Ignored builds:** none at first. The owner wants a preview on every PR, docs-only ones included. If build usage turns out to matter, an `ignoreCommand` that skips commits touching only `.scratch/`, `docs/`, `android/` and `workers/tiles/` is one line.
- **Cloudflare, `para`:** builds off (Workers & Pages → `para` → Settings → Build → Disconnect). The last deployment keeps serving `www` until the DNS switch, and stays deployed for the rollback.
- **Cloudflare, `para-tiles`:** if it builds from Git, Settings → Build → Build watch paths: include `workers/tiles/*` only, so a commit elsewhere costs no minutes. The tiles' data is uploaded by `tiles.yml`, not by this build.

## 4. The switchover

Production shows Coming soon throughout: on Cloudflare until the switch, on Vercel after, because the Vercel production deployment is gated from its first build (04 lands before the owner links the project).

1. **Code lands on `staging`** (02–06). Nothing changes for any visitor.
2. **The owner links the project** (07). Every PR gets `para-git-<branch>-<team>.vercel.app`; `staging` gets `staging.para-commute.org` (a CNAME at Cloudflare, DNS only).
3. **The preview check** (09): a session runs the checklist against a PR preview and `staging.para-commute.org`; the owner looks at the screens. `main` is not touched.
4. **`main` deploys on Vercel** when the owner next merges `staging` into `main`. Its production alias (`para-<team>.vercel.app`) answers Coming soon. 09 runs its production half there.
5. **DNS** (10), at a quiet hour: `www` from the proxied `AAAA 100::` (Workers route) to the `CNAME` Vercel's domain page shows, **DNS only**. The bare domain's redirect rule and `tiles` are untouched. The zone's CAA records already allow `letsencrypt.org`, which Vercel uses.
6. **Watch 14 days.** The Worker, its route and its secrets stay as they are.
7. **Retire** (11): delete the `www` Workers route and the `para` Worker; remove `wrangler.jsonc`; move `workers/site/src/*` beside the middleware; update the docs; ADR 0011 to Accepted.

**Rollback** (any time in step 6): Cloudflare DNS → `www` back to `AAAA 100::`, **Proxied**. The Workers route still sends it to `para`'s last deployment, within the record's TTL (5 minutes). That deployment carries the published map of the day builds stopped; to bring it current, the owner reconnects the build (minutes allowing) or runs `npm run build && npx wrangler deploy` from `main`.

## 5. Risks and open questions

- **Rate limiting.** Whether the Firewall's rate-limit rule is included on Pro or billed per request is for the owner to read (`vercel pricing firewall`, or the Firewall page). The fallback is weaker but free. The Firewall's dashboard shows top client addresses: Para stores none, but Vercel's traffic view does, as Cloudflare's analytics did. Owner to accept.
- **Bandwidth.** The site's own files and `/data/*` count against Pro's included transfer. At 100,000 commuters the published map is the largest part. If it grows, `/data/` can later be served from the tiles Worker; out of scope here.
- **Middleware cost.** It runs on every page address (not on files). Its included allowance on Pro is for the owner to confirm on the Usage page.
- **A new dependency.** The middleware's `rewrite()` comes from `@vercel/functions`. CLAUDE.md asks before adding one: it replaces nothing (Cloudflare's runtime had it built in), and the alternative is setting Vercel's internal `x-middleware-rewrite` header by hand, which is undocumented. **Owner's yes needed** (04).
- **Deployment Protection.** On Pro, Vercel Authentication is on for previews by default: only signed-in team members see them. The owner chooses: keep it (previews private) or turn it off for previews (anyone with the link). Custom domains (`www`, `staging.`) are never protected either way.
- **Certificate gap.** Vercel issues `www`'s certificate once DNS points to it; a minute or two of TLS errors is possible. Adding the domain to the project first, and the `_vercel` TXT record if Vercel asks for one, keeps it short.
- **Tiles on previews.** Without 12, every Vercel preview's basemap is blank (the tiles' CORS list). 12 changes the tiles Worker, which deploys through Cloudflare: one small build, or the owner's `wrangler deploy` while minutes are out.
- **Nothing can't move.** Every behaviour of the Worker has an equivalent above.

## Proposed edits to `.claude/CLAUDE.md` (for the owner; not made here)

In the Stack table:

- Add a row: `| Vercel | Hosts the site (the public map, the studio, the contributor page) from the build in dist/, a Function for /api/report and the Routing Middleware that shows Coming soon on production. Every branch and PR gets a preview (ADR 0011) |`.
- Change the Cloudflare Turnstile row's start to "The bot check on the studio's sign-in, a contributor's first save and a route report…" (the report already uses it; unchanged otherwise).
- Change the Cloudflare R2 row to: `| Cloudflare | The tiles Worker and R2 (tiles.para-commute.org, ADR 0007), the weekly encrypted backup in R2, Turnstile, and DNS for para-commute.org. The site is not hosted here (ADR 0011) |`.

Under Folder structure, after the `android/` paragraph:

- "`api/` holds the site's Vercel Functions (today `report.ts`) and `middleware.ts` at the root is its Routing Middleware; both stay thin and call code that Node's unit checks can import. `vercel.json` holds the site's routing and headers."

## Tickets

| # | Ticket | Who |
| --- | --- | --- |
| 01 | [Stop Cloudflare's build minutes](issues/01-stop-cloudflare-builds.md) | Owner |
| 02 | [vercel.json: output, routing, build](issues/02-static-output-and-routing.md) | Opus |
| 03 | [The headers move into vercel.json](issues/03-headers-in-vercel-json.md) | Opus |
| 04 | [Coming soon as Routing Middleware](issues/04-coming-soon-middleware.md) | Opus (owner's yes on the dependency) |
| 05 | [/api/report as a Vercel Function](issues/05-report-function.md) | Opus |
| 06 | [Preview hostnames in the code](issues/06-preview-hostnames.md) | Sonnet |
| 07 | [The Vercel project](issues/07-owner-vercel-project.md) | Owner |
| 08 | [Turnstile and Supabase allow staging](issues/08-owner-allowlists.md) | Owner |
| 09 | [The preview check](issues/09-preview-check.md) | Opus, then the owner |
| 10 | [Point www at Vercel](issues/10-dns-switch.md) | Owner, a session checks |
| 11 | [Retire the para Worker](issues/11-retire-para-worker.md) | Opus, owner deletes |
| 12 | [The tiles Worker allows the Vercel origins](issues/12-tiles-allow-vercel-origins.md) | Opus, owner deploys |

Order: 01 now; 02, 05, 06 in parallel, then 03 and 04 (after 02: the three edit `vercel.json`); 07 once 02–05 are on `staging`; 08 and 12 after 07; 09; `main` deploys; 10; 11 after 14 days.
