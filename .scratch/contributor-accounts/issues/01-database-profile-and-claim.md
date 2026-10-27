# 01: The database: profile and claim

Status: resolved
Type: task
Who: a session writes it; the owner applies it
Blocked by: —

Spec: [../spec.md](../spec.md), "One identity, upgraded" and "Who sees what".

## What to write

One migration in `supabase/migrations/` (timestamped name, like `20261023090000_signup_hook.sql`), with its `supabase/apply/` apply, check and revert files and a section in `supabase/apply/README.md`, in the same style as the contributions migration.

1. **Profile on `public.contributor`:** `name text` (1–80 chars), `phone text` (`^\+639[0-9]{9}$`), `profile_updated_at timestamptz`. Both nullable: anonymous contributors and rows made before this have none.
2. **`public.set_profile(name text, phone text)`**, security definer, `search_path = ''`: only a signed-in, **non-anonymous** user (`auth.jwt() ->> 'is_anonymous'` false); upserts their own contributor row; validates both. Execute granted to `authenticated` only.
3. **Who reads name and phone:** a contributor reads its own row (as today). Editors read `name` but **not** `phone` (column privileges or a view for the studio; say which and why). Email stays only in `auth.users`.
4. **Claim:**
   - `public.begin_claim() returns uuid`: callable only by an **anonymous** user; stores a one-time token (new table in `private`, with the anonymous user's id, made_at, used_at), valid 10 minutes.
   - `public.finish_claim(token uuid)`: callable only by a **non-anonymous** user; if the token is unused and fresh, moves every `contribution` (and nothing else needs moving: points and hintos hang off the contribution) from the anonymous contributor to the caller's contributor row (made if missing), marks the token used, and deletes the anonymous contributor row and its auth user is left alone (Supabase cleans anonymous users; say if not). A blocked anonymous contributor's block carries over to the account.
   - Both refuse anything else with a clear error. Idempotent: a second `finish_claim` with the same token does nothing.
5. **Nothing else changes:** `save_contribution`, RLS on `contribution` (the contributor is still `auth.uid()`), the signup hook.

## Acceptance checks

- The check file proves: set_profile refuses anonymous callers and bad numbers; a contributor can't read another's phone; editors can read name, not phone; a claim moves exactly the anonymous identity's contributions; a reused or expired token does nothing.
- The migration and the README section; **not applied** (the owner applies).
- `npm run check` passes.
