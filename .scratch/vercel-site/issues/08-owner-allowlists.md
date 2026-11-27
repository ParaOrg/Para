# 08: Turnstile and Supabase allow staging

Status: ready-for-human
Type: task
Who: the owner
Blocked by: 07

## What to do

1. **Turnstile** (Villaralvorovic2 Cloudflare account → Turnstile → the widget → Settings → Hostnames): check that `para-commute.org` is listed. A hostname covers its subdomains, so `staging.para-commute.org` is then allowed. Tell the hub the full list as it is today (it may also hold `workers.dev` names, which go in ticket 11). Don't add `vercel.app`: branch previews are not for signing in.
2. **Supabase** → Authentication → URL Configuration → Redirect URLs: add `https://staging.para-commute.org/**`. The Site URL stays `https://www.para-commute.org`.

## Acceptance checks

- [ ] On `https://staging.para-commute.org/studio/`, the sign-in's bot check passes, and Forgot password's email link lands back on staging.
- [ ] On `www`, nothing changed (Coming soon; the studio signs in).

## Comments
