# 07: Forgot password

Status: claimed
Type: task
Who: a session (`claude/accounts-07-forgot-password`)
Blocked by: 02 (resolved). The owner sets up email sending in Supabase (below) before it works for real; the code does not wait for it.

Spec: [../spec.md](../spec.md), "Not now" (password reset was left out; the owner brought it in on 2026-10-26).

## The owner's decisions (2026-10-26)

- **A 6-digit code, not a link.** On Sign in, a "Forgot password?" button. Then: enter your email (+ Turnstile, as sign-in does) → `resetPasswordForEmail(email, { captchaToken })` → enter the 6-digit code and a new password → `verifyOtp({ email, token, type: 'recovery' })`, then `updateUser({ password })` → signed in, the same end state as `signIn` (profile and History as after it). No deep links, no redirect pages. Works the same on `/contribute/` and in the Android app build.
- **Look: the same as Sign in and Create account.** Reuse `AccountPanel`, `TextField`, `PasswordField`, `Button`. No new visual style. Plain wording; every new line of copy is listed in the PR for the owner to approve.
- **Email goes through Resend SMTP** that the owner configures in Supabase, and the owner edits the "Reset password" template to show `{{ .Token }}`. This ticket touches no Supabase setting.

## What to build

- In `features/contribute/api/` (the only place Supabase is called): `requestPasswordCode({ email, captchaToken })` and `resetPassword({ email, code, password })`. The reset replaces the phone's anonymous session the way `signIn` does (`aroundEarlierIdentity`), so earlier uploads are claimed by the account.
- Sending the code always reports the same thing, "If that email has an account, we sent a code": whether an account exists is never revealed. A failure that says nothing about the account (no signal, bot check, too many emails) is still shown.
- New problems in `account-problem.ts`, each with its own line and never "Wrong email or password": an invalid code, an expired code (`otp_expired`), too many emails (`over_email_send_rate_limit`), the new password the same as the old (`same_password`).
- Screens: Forgot password (email), Reset password (code, new password, "Send a new code"). Turnstile token fresh for each send (single use; `use-captcha.ts`).
- Stories for each new screen state: default, sending, error, code expired.

## Acceptance checks

- Unit checks for the new error mapping and the new fields.
- e2e in `tests/e2e/` like the account suites, with Auth mocked (nothing reaches a real project).
- Size guards pass: the contributor page's first load stays under 30 kB; the account screens load on demand.
- `npm run check` passes.
- The PR lists the new copy and the owner's steps: Resend account and verified domain; Supabase → Authentication → Emails → SMTP settings; the Reset password template; Email OTP length 6.
