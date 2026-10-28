# 05: Switch, check and retire Vercel

Status: in progress (the switch is done; Vercel and the rate limit are left)
Type: task
Who: Owner; the hub checks
Blocked by: 02, 03, 04

## What to do

In this order, at a quiet hour:

1. **Tiles first.** Worker `para-tiles` → Settings → Domains & Routes → Add → Custom domain → `tiles.para-commute.org`. The hub merges 04; staging reads its tiles from there.
2. **Rate limit.** Security → WAF → Rate limiting rules, on `tiles.para-commute.org` (the number is the hub's to propose from the load test).
3. **Sign-in.** Turnstile's hostnames get `para-commute.org`. Supabase → Authentication → URL Configuration: Site URL `https://www.para-commute.org`, and `https://www.para-commute.org/**` as a redirect URL.
4. **The app.** Worker `para` → Custom domain → `www.para-commute.org`. Then a redirect rule: `para-commute.org/*` → `https://www.para-commute.org/$1`, 301, query kept.
5. **The hub checks** (below). If anything is wrong, remove the custom domain; the old site needs its Vercel records back to answer again, so keep a copy of them until step 6.
6. **Retire Vercel.** Remove `para-commute.org` from the old Vercel project. Delete the project when the owner chooses.

The new app reaches `www.para-commute.org` only from `main`. If `main` does not yet carry the work on `staging`, the domain shows today's `main`, and the owner releases `staging` when ready.

## Acceptance checks

- `https://para-commute.org` → 301 → `https://www.para-commute.org/`, which serves the new app, with its worker, sign-in and Forgot password working.
- A phone with the old app (03's fixture, and one real phone) opens the new app with no prompt and no old cache left.
- `tiles.para-commute.org`: a repeated tile shows `cf-cache-status: HIT`; another site's origin gets 403; the rate rule answers 429 past its limit.

## Comments

**2026-10-28, the switch (the owner, with the hub).**

The Worker's custom-domain picker could not see the just-activated zone ("No zones match"), so both hostnames are **Workers routes on the zone**, each with a proxied placeholder record:

- `tiles.para-commute.org/*` → `para-tiles`, with AAAA `tiles` `100::` (Proxied).
- `www.para-commute.org/*` → `para`, with AAAA `www` `100::` (Proxied). Vercel's two `www` A records were deleted.
- `para-commute.org`: a redirect rule, wildcard `https://para-commute.org/*` → `https://www.para-commute.org/${1}`, 301, query kept, and AAAA `@` `100::` (Proxied). Vercel's A record was deleted. **Always Use HTTPS** is on, so `http://` reaches the rule too.

Sign-in: Turnstile has `www.para-commute.org` and `para-commute.org`. Supabase has `https://www.para-commute.org/**` as a redirect URL and `https://www.para-commute.org` as the Site URL. The release (#468) reached `main`, and `para` builds from `main`.

The hub checked:
- `www` serves the new app (`/`, `/studio/`, `/contribute/`, the published map of 2026-10-27 23:50 UTC), and `/contribute/` is not frameable.
- The map draws from `tiles.para-commute.org`, and a repeated tile is `cf-cache-status: HIT`. The www origin is allowed and others get 403.
- The bare domain and every `http://` address end at `https://www.…`.

**Left:**
- Remove `para-commute.org` from the old Vercel project.
- The rate-limit rule on `tiles.para-commute.org`.
- One real phone with the old "Para PH" app installed opens the new app.
- Later: the old `parapo` Worker in the Villaralvorovic2 account, and its Turnstile hostnames.
