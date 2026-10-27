# 07: Turnstile on the studio's sign-in

Status: resolved
Type: task
Wave: 2
Who: Sonnet
Blocked by: 02, 03

## What to build

`../database.md` §2, fix 2. Supabase's CAPTCHA setting guards sign-up, sign-in and password reset for the whole project. The day it is switched on (09), the studio's sign-in and "Forgot password?" need a Turnstile token, or editors are locked out. This lands first.

- **A Turnstile widget** in `src/shared/ui/turnstile.tsx` (the contributor page uses it too, ticket 13): loads Cloudflare's script only when it mounts, renders the widget, hands back the token, and resets after a failed attempt. Accessible: a label, visible focus, and a plain message if the script can't load. A story.
- **The studio's Sign in and Forgot password** pass `options.captchaToken` to `signInWithPassword` and `resetPasswordForEmail`. With CAPTCHA still off, Supabase ignores the token (check it), so this can ship before 09.
- **The site key** is public: `VITE_TURNSTILE_SITE_KEY` in `.env.production`, parsed where 03 put the studio's environment. Development and the headless suites use Cloudflare's always-pass test key.
- **`check-build.mjs`:** the public page contains no `challenges.cloudflare.com`, with the studio as the positive control.
- `public/_headers`: the studio's CSP sets only `frame-ancestors`, so Turnstile's frame is allowed. Confirm, and say so in the PR.

**The owner's part:** create the Turnstile widget in Cloudflare for the production and preview hostnames, and send the site key.

## Files it owns

`src/shared/ui/turnstile.tsx` and its story, `src/features/studio/auth/` (the sign-in and reset forms), the studio's env module, `.env.production`, `scripts/checks/check-build.mjs` (one check).

## Acceptance checks

- `npm run check`; `build-storybook`; a `ds-reviewer` PASS for the widget.
- The studio's headless suite signs in with the test key.
- With CAPTCHA off in Supabase, editors sign in exactly as before.

## Comments

2026-10-26, status check on `staging`. Done; commit 5fca7cbe. Evidence: `src/shared/ui/turnstile.tsx` (+ stories), `src/features/studio/auth/use-captcha.ts` (sign in, forgot password, change password), site key in `.env.production` and `src/features/studio/data/env.ts`, the Turnstile check in `scripts/checks/check-build.mjs`, `tests/e2e/turnstile-test.mjs` in CI; the studio CSP in `public/_headers` sets only `frame-ancestors`. The owner turned CAPTCHA on and signed in through it on 2026-10-23 (see 09's Answer). No migration.
