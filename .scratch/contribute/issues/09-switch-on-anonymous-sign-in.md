# 09: Switch on anonymous sign-in and Turnstile

Status: resolved
Type: task
Wave: 3
Who: the owner, in the Supabase and Cloudflare dashboards; a session writes the hook if it is needed
Blocked by: 07, 08

07 must be merged and released first, or editors can't sign in once CAPTCHA is on.

## What to do

1. **The sign-up switch** (`../database.md` §2, fix 3). Check whether anonymous sign-ins need "Allow new users to sign up" on.
   - If they do, a session writes `0022_signup_hook.sql`: a "Before User Created" hook function in `private` that refuses every sign-up that isn't anonymous. You apply it, then select it under Authentication, Hooks, before turning sign-ups on.
2. **Turnstile:** in Supabase, Authentication, Bot and Abuse Protection: CAPTCHA on, provider Turnstile, with the widget's secret key from Cloudflare (made for 07). The secret goes nowhere else.
3. **Anonymous sign-ins on**, under Authentication, Sign In / Providers.
4. **Check:**
   - you sign in to the studio, through Turnstile;
   - an email sign-up is refused;
   - an anonymous sign-in from the contributor page works (or, before 13, from a test page on the preview);
   - the advisors and the audit query (§13) show nothing new.

## Acceptance checks

- The four checks above, noted under `## Answer`, with the date.
- `Status: resolved`.

## Answer

2026-10-23, the owner, on production:

- **Sign-ups:** "Allow new users to sign up" was off, so GoTrue answered every anonymous sign-in with 422 (`signup_disabled`) and the contributor page wrongly said "no signal" (fixed in #357). The owner applied `20261023090000_signup_hook` (#356; ledger `20261023035741`, `_check.sql` 8/8 true), selected it under Authentication, Hooks, Before User Created, and only then turned sign-ups on.
- **Turnstile:** CAPTCHA on, provider Turnstile, secret set in Supabase.
- **Anonymous sign-ins:** on.
- **Checks:**
  - studio sign-in through Turnstile works;
  - an email sign-up is refused: proved by the check file's call of the hook with an email event (403). A live curl is stopped by CAPTCHA before the hook runs;
  - an anonymous sign-in from the contributor page works: a recording held on the owner's phone uploaded on Try again;
  - Security Advisor: 0 errors. 26 warnings, all expected now that anonymous sign-ins are on: "Anonymous Sign-Ins Allowed" on the RLS tables, and "Signed-In Users Can Execute SECURITY DEFINER Function" on the studio's draft, takedown and block functions, each of which calls `private.require_editor()` / `private.is_editor()` first, so an anonymous phone is refused. The audit query (§13) was not run.

## Comments
