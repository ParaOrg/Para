# 05: Switch, check and retire Vercel

Status: needs-info (waits on 02, 03, 04)
Type: task
Who: Owner; the hub checks
Blocked by: 02, 03, 04

## What to do

In this order, at a quiet hour:

1. **Tiles first.** Worker `parapo-tiles` → Settings → Domains & Routes → Add → Custom domain → `tiles.para-commute.org`. The hub merges 04; staging reads its tiles from there.
2. **Rate limit.** Security → WAF → Rate limiting rules, on `tiles.para-commute.org` (the number is the hub's to propose from the load test).
3. **Sign-in.** Turnstile's hostnames get `para-commute.org`. Supabase → Authentication → URL Configuration: Site URL `https://www.para-commute.org`, and `https://www.para-commute.org/**` as a redirect URL.
4. **The app.** Worker `parapo` → Custom domain → `www.para-commute.org`. Then a redirect rule: `para-commute.org/*` → `https://www.para-commute.org/$1`, 301, query kept.
5. **The hub checks** (below). If anything is wrong, remove the custom domain; the old site needs its Vercel records back to answer again, so keep a copy of them until step 6.
6. **Retire Vercel.** Remove `para-commute.org` from the old Vercel project. Delete the project when the owner chooses.

The new app reaches `www.para-commute.org` only from `main`. If `main` does not yet carry the work on `staging`, the domain shows today's `main`, and the owner releases `staging` when ready.

## Acceptance checks

- `https://para-commute.org` → 301 → `https://www.para-commute.org/`, which serves the new app, with its worker, sign-in and Forgot password working.
- A phone with the old app (03's fixture, and one real phone) opens the new app with no prompt and no old cache left.
- `tiles.para-commute.org`: a repeated tile shows `cf-cache-status: HIT`; another site's origin gets 403; the rate rule answers 429 past its limit.

## Comments
