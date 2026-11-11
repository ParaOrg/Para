# Ledger rows for my_contribution_uses and backup_reader, and comments naming the retired review functions

Status: ready-for-agent
Type: task
Priority: low, after #912

## What happens

**The ledger.** `supabase/migrations/20261106090000_my_contribution_uses.sql` is live: `public.get_my_uses()` exists
(the hub checked, read-only, on 2026-11-11). But `supabase_migrations.schema_migrations` has no row named
`my_contribution_uses`. `supabase/migrations/README.md` says the version `20261106090000` was "recorded by hand",
but it was not. A tool that reads the ledger thinks the migration was never applied. For example, the Supabase
CLI's `migration list` would offer it again, and re-running it is harmless only because it is `create or replace`.

**backup_reader too.** `supabase/migrations/20261022100000_backup_reader.sql` is live as well: the role
`backup_reader` and `private.grant_backup_reader()` exist (the hub checked, read-only, on 2026-11-11). But the
ledger has no `backup_reader` row, `supabase/migrations/README.md` still says "Not applied live", and
`supabase/verify/schema-snapshot.sh` leaves it out ("written but not applied").

**The comments.** `retire_review_steps` is applied live (2026-11-11, ledger `20261111173006`): `approve_draft`,
`approve_reviewed_draft`, `submit_draft` and `send_back_draft` are gone. These comments still describe them as live:

- `src/features/studio/data/drafts.ts:22` and `:71` ("as approve_draft reads it", "approve_draft writes 'drawn'")
- `src/features/studio/data/draft-save.ts:21` ("only approve_draft does")
- `src/features/studio/data/route-draft-state.ts:42` ("approve_draft never writes it")
- `tests/e2e/lib/fake-studio-db.mjs:25`, `:312`, `:321`, and its handling of `submit_draft`, `approve_reviewed_draft`
  and `approve_draft` (`:453`, `:485`, `:488`). The fake still answers RPCs the database no longer has.

The e2e checks that `submit_draft` is never called (`tests/e2e/save-drafts-test.mjs:672`, `:952`) stay: they guard
against the old path coming back.

## What it should do

1. **A ledger-only paste file for the owner:** `supabase/apply/20261111200000_ledger_catch_up.sql`.
   - It is one transaction, covering both rows, each only if missing:
     - `('20261106090000', 'my_contribution_uses', '{}')`, but only if `public.get_my_uses()` exists;
     - `('20261022100000', 'backup_reader', '{}')`, but only if the role `backup_reader` and
       `private.grant_backup_reader()` exist.
   - If a migration's objects are missing, it raises: nothing was applied, so nothing goes in the ledger.
   - Then it checks there is exactly one row of each name, and raises otherwise.
   - It changes nothing else. A second run changes nothing.
2. **`supabase/migrations/README.md`:**
   - `my_contribution_uses`: replace "the version is recorded by hand" with what is true, that the owner records
     it with that paste file.
   - `backup_reader`: replace "Not applied live" with when it was applied, if known, and the same paste file.
   - Once the owner has run it, say both are recorded, with the date.
3. **`supabase/verify/`:**
   - A few lines prove the paste file: on a database with both migrations' objects, it inserts each row once, and a
     second run changes nothing; with either one's objects missing, it refuses and changes nothing.
   - `schema-snapshot.sh` lists `20261022100000_backup_reader` in `APPLIED`, in its ledger order, and
     `supabase/schema/snapshot.sql` is rewritten in the same PR (`--write`).
4. **The comments:** describe what happens now (`publish_draft` applies a draft) or drop the history, per the
   comment rules in `.claude/CLAUDE.md`.
5. **The fake:** drop the retired RPCs from `fake-studio-db.mjs`, so a call to one fails as it would live. Run the
   suites that use the fake (save-drafts-test, save-test, studio-two-editors-test, review-test) before merging.

## Done when

- The paste file, its verify lines and the README fix are in one PR, handed to the hub for the owner to run.
- After the owner runs it, the ledger has both rows, and `migration list` offers neither `my_contribution_uses`
  nor `backup_reader`.
- No source comment names a retired review function as live, and the fake answers only the RPCs the database has.
