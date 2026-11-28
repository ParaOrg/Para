# 10: Point www at Vercel

Status: paused 2026-11-27 (was ready-for-human): the owner chose GitHub Actions → Cloudflare (`../spec.md`)
Type: task
Who: the owner; a session checks
Blocked by: 09, and `main` deployed on Vercel

## Before

- Write down `www`'s record exactly as it is (today: `AAAA www 100::`, Proxied, with the Workers route `www.para-commute.org/*` → `para`). Don't touch the route.
- Vercel → para → Settings → Domains → add `www.para-commute.org` (production). If Vercel asks for a `_vercel` TXT record to verify, add it at Cloudflare first. Don't add `para-commute.org`: the Cloudflare redirect rule keeps sending it to `www`.

## The switch (a quiet hour, Manila evening)

1. Cloudflare → para-commute.org → DNS → `www`: delete the `AAAA 100::` record and add the `CNAME` Vercel shows (e.g. `cname.vercel-dns.com`, or the project-specific one it names), **DNS only**.
2. Wait for Vercel's domain page to show the certificate issued (a minute or two).
3. The session checks: `/` and `/app/` → Coming soon; `/studio/` and `/contribute/` load and the studio signs in; `/data/index.v6.json` is JSON; `/sw.js` is the retiring worker; `https://para-commute.org/x` → 301 → `https://www.para-commute.org/x`; `curl -sI https://www.para-commute.org/` shows `server: Vercel`; the APK's map loads; 05's production checks; the watch workflow stays green for an hour.

## Rollback

Cloudflare DNS → `www` back to `AAAA 100::`, **Proxied**. The Workers route still serves `para`'s last deployment within 5 minutes. Its published map is the one from the day builds stopped (ticket 01); to bring it current, reconnect its build or run `npm run build && npx wrangler deploy` from `main`.

## Acceptance checks

- [ ] Every check in step 3 passes.
- [ ] 14 days with no rollback, then ticket 11.

## Comments
