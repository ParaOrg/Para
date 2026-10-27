# 02: Sign up and sign in

Status: resolved
Type: task
Who: a session
Blocked by: 01's contract (build against it; it needn't be applied)

Spec: [../spec.md](../spec.md), "One identity, upgraded", "The contributor page", "Fields, with no extra labels".

## What to build

- In `features/contribute/api/`: `signUp({ name, email, phone, password, captchaToken })` (ensure the anonymous user, then `updateUser({ email, password })`, then `set_profile`), `signIn({ email, password, captchaToken })` (for a phone with no anonymous user; with one, leave the claim to 04 but call its hook point), `signOut()`, and a TanStack Query hook for "who is signed in" (anonymous counts as **not** signed in to an account). Zod at every boundary; errors mapped to one-line messages ("Wrong email or password", "That email already has an account", "No signal — try again when you're online").
- Screens in today's style: Sign in (Email, Password, Sign in, "Create account") and Create account (Name, Email, Number, Password, Create account, "Sign in"). Use the existing `InputField` and `Button`; no helper text, no descriptions. Turnstile as the contributor page already loads it.
- Gate: no account → only these screens; with one → Ready as today. A recording already on the phone isn't touched.
- Number: accept 09XXXXXXXXX or +639XXXXXXXXX, store +639XXXXXXXXX (a pure, unit-tested function).

## Acceptance checks

- Unit tests for validation and the number. e2e: create account, sign out, sign in, wrong password. **e2e must not reach the real Supabase**: route the auth and RPC calls to mocks (see the audit's H2, `.scratch/audit/2026-10-23-codebase-check.md`).
- Stories for both screens: default, error, busy.
- `npm run check` passes.
