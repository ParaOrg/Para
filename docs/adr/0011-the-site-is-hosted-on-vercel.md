---
status: proposed
date: 2026-11-27
---

# The site is hosted on Vercel; tiles, backup and bot check stay on Cloudflare

Paused 2026-11-27: the owner chose to stay on Cloudflare and deploy from GitHub Actions instead (`docs/operations.md`, How the site deploys). This record stays Proposed.

The site (the public map at `/`, the studio at `/studio/`, the contributor page at `/contribute/`, and the published map under `/data/`) was the Cloudflare Worker `para`, built by Workers Builds on the free plan. In November 2026 that plan's 3,000 build minutes ran out and builds paused until 1 December: no PR got a preview and `main` could not deploy. On 2026-11-27 the owner chose to host the site on the owner's Vercel Pro plan, with a preview for every PR and no limit on them (`.scratch/vercel-site/spec.md`).

## Decision

- **Vercel serves the site.** The build is the same `npm run build`, every guard and budget in `scripts/checks/check-build.mjs` included, so a guard that fails stops the deploy. The output is `dist/`. `vercel.json` holds what `wrangler.jsonc` and `public/_headers` held: the single-page fallback, the trailing-slash redirects, the cache, security and content-policy headers.
- **Coming soon is Routing Middleware** (`middleware.ts`): on a production deployment it answers the map's pages with Coming soon and `/sw.js` with the retiring worker, as the Worker did on the production hosts. Every preview and `staging` keep the map.
- **`/api/report` is a Vercel Function** (`api/report.ts`) running the same handler, Turnstile check and database call. Its rate limit is a Vercel Firewall rule (5 a minute per sender) in place of Cloudflare's binding, and its two secrets are production-only Vercel environment variables.
- **Previews:** every branch and PR gets a `*.vercel.app` address; `staging` gets `staging.para-commute.org`.
- **Cloudflare keeps:** the tiles Worker and its R2 bucket (`tiles.para-commute.org`, ADR 0007), because tile traffic is free there and would be billed on Vercel past 1 TB; the weekly encrypted backup in R2; Turnstile; and DNS for `para-commute.org`, where only the `www` record points to Vercel. The bare domain's redirect to `www` stays a Cloudflare rule.

## Consequences

- The origin `https://www.para-commute.org` does not change, so installed apps keep their offline worker and stores, the contributor app keeps reading `/data/` from it, and Supabase's Site URL and Turnstile's production hostnames stay as they are.
- The public `VITE_` values stay committed in `.env.production`; Vercel holds only the report's two secrets.
- The tiles Worker's CORS list gains `staging.para-commute.org` and this project's `vercel.app` addresses, or previews have no basemap.
- Branch previews are still not for signing in: Turnstile and Supabase allow `staging.para-commute.org`, not `vercel.app`.
- The site's own bandwidth and the middleware's runs count against Vercel Pro's allowance; the tiles, the larger traffic, do not.
- Rollback while the `para` Worker is kept (14 days): `www` back to its proxied record at Cloudflare. After that, `wrangler.jsonc`, `public/_headers` and the Worker go, and `workers/site/src/` moves beside `api/`.
- The domain was on Vercel once before, for the older "Para PH" app, and moved to Cloudflare on 2026-10-28 (`.scratch/custom-domain/`). That move was for the zone and the tiles' edge cache, which stay; only the site's hosting returns.
- Rejected: staying on Workers Builds and paying for more minutes (the owner wants no preview limit); building in GitHub Actions and deploying with `wrangler` (Actions minutes are free for a public repo, but a preview per PR would mean writing and keeping a deploy workflow and its Cloudflare token); moving the tiles too (billed bandwidth).
