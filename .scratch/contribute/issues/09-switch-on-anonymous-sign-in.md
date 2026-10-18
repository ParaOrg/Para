# 09: Switch on anonymous sign-in and Turnstile

Status: ready-for-human
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

## Comments
