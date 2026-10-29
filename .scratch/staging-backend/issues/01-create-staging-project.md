# 01: Create the staging project

Status: needs-info (owner: later; the Free plan's two-project limit is reached)
Type: task
Who: the owner, with a checklist a session writes

## What to do

A session first writes the step-by-step checklist under `## Comments`, from the live project's settings as the repo records them (`supabase/`, `supabase/apply/README.md`, `docs/operations.md`). Then the owner:

1. Creates a Supabase project `para-staging` in the Para organisation, region Singapore, Free plan.
2. Applies every migration in `supabase/migrations/`, in order (the checklist names the command or dashboard steps).
3. Copies the live project's Auth settings: anonymous sign-ins, the Turnstile secret, the password-reset email, and the Site URL and redirect URLs, set to the staging address.
4. Adds the staging address to the Turnstile widget's hostnames.
5. Creates one editor account for testing.
6. Sends the hub the project's URL and publishable key. Both are public by design, like the live ones in `.env.production`. Never a secret key or a database password.

## Done when

The staging project exists with every migration applied, and the hub has its public URL and key.

## Comments

- 2026-10-29, the owner: Supabase refused a third project. The owner's account has reached its limit of 2 active free projects, so the choices are to upgrade the Para organisation to Pro, or to pause or delete an unused free project. The owner chose to keep this as a plan for later.
