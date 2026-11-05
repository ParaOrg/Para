# Database review 2026-11-05

Read-only, on `origin/staging` at fe999622. It reconstructs the schema from every migration in ledger order and reads how the app and the publish use it. Nothing live was read or changed. Asked by the owner: "is our database tangled? Most of my studio changes are making it messier."

## Verdict

- **The core is sound, but it is tangled.** Tables, constraints, locking and the approved-only reads are careful work. Most of the mess sits around them: 35 migrations that each patch the one before, two ways to write the map, and a review flow with more states than the studio now uses.
- **The biggest tangle is in the studio.** Production saves through drafts, but editors can still write the published tables directly, and the `draft` table has been re-ruled four times in three weeks.
- **One real integrity risk is on the contributor side.** Deleting a user anywhere except through the app's own delete wipes their recordings.

## High: integrity and security

**H1. The review step can be bypassed with direct writes. Size M, after M1.**
- *Evidence:* `0015_shared_editing.sql:241-271` lets any editor insert, update or delete `route`, `route_variant`, `stop` and `route_stop` directly. These grants still stand, although production saves through drafts (`.env.production` `VITE_STUDIO_DRAFTS=1`). The direct-write code is still in the app behind the flag (`studio/data/routes-write.ts`, `hotspots-write.ts`), and CI still runs it with drafts off.
- *Impact:* an old cached studio build, a script, or an editor's browser console can change or hard-delete published data with no draft, no approval and no takedown record. A direct `DELETE` on a route cascades to its directions and links (`0001:49,101`).
- *Fix:* once M1 has removed the flag and the old write path, revoke insert, update and delete on those four tables from `authenticated`. The review functions run with their owner's rights and keep working.

**H2. Deleting a user outside the app deletes their uploads. Size M.**
- *Evidence:* `contributor.id` → `auth.users` is `on delete cascade` (`20261019125900_contributions.sql:28`), and `contribution.contributor_id` → `contributor` is too (`:38`). Only `delete_my_account` unlinks recordings first.
- *Impact:* deleting a user from the Supabase dashboard, a clean-up of anonymous users, or an admin script erases all of that person's contributions, points and hintos. That breaks the "uploads survive account deletion" rule.
- *Fix:* a `before delete` trigger on `contributor` that unlinks first (`contributor_id = null`, `unlinked = true`, typed words cleared), or a `set null` foreign key plus a trigger, proven with a verify script.

**H3. Approving a draft can skip the revision check. Size S.**
- *Evidence:* `approve_draft(uuid)` is still granted to `authenticated` (`0022:745,753`). `approve_reviewed_draft` is only a wrapper that adds the "same revision you saw" check, and the app still has a fallback that calls the unchecked one (`studio/data/drafts.ts:175-176`).
- *Fix:* one approval function, with the check built in. Revoke the old one as part of the Draft ↔ Published step.

## Medium: tangle that costs effort

**M1. Two write paths in the studio. Size L.**
- The `STUDIO_DRAFTS` flag touches about 15 files, so every database rule has to support both the direct writes and the draft functions.
- *Fix:* delete the flag and the direct path, and move the e2e tests to drafts. This is the prerequisite for H1.

**M2. The `draft` table's rules keep flip-flopping. Size S.**
- `draft_update` has been defined four times: 0018, `draft_update_own`, `review_rules`, then `draft_update_makerless`.
- The app edits drafts with a direct table update while everything else goes through functions. So `status` must stay updatable, and an editor can mark a draft pending without `submit_draft`.
- *Fix:* one `save_draft` function, then revoke direct update on `draft`.

**M3. More review machinery than the simpler flow needs. Size L (it is the redesign).**
- *Count today:* 3 tables, 6 draft-state columns, and 3 status columns each on route and stop. 9 review functions, 7 helpers and about 10 triggers. A route's `revision` is moved by 3 different triggers.
- *Pending already does nothing in practice:* Approve submits and then approves in one press.
- *Unused:* `send_back_draft` has no caller in the app.
- *Keep:* the `base_revision` conflict check, the lock order and the end guards.

**M4. Columns and tables nothing uses. Size M.**
- `gps_session`, its policies and indexes.
- `route.short_name` and `fare_as_of`: never written.
- `route.route_code` and `long_name`: the publish reads them, but approval never writes them, so a train line created through a draft gets no line code.
- `route_variant.direction_name`, `origin_terminal` and `destination_terminal`: 0006 said `direction_name` would go.

**M5. The same function bodies are copied again and again. Size S each.**
- `retire_month`, `save_contribution` and `delete_my_account` exist in 3 full copies each, and several others in 2. The newest is the live one, and no stale overloads are left.
- To know what one function does, you read three files. That's the "messier with every change" feeling; a schema snapshot (step 6) ends it.

**M6. The migrations folder no longer builds the live database by itself. Size M.**
- *Names:* the timestamped file names differ from their ledger versions.
- *Order:* `0018` needs `is_loop` from `0021`, so file-name order fails. Only `verify/run.sh`'s hand-ordered list builds the schema.
- *An unapplied file among the applied:* `backup_reader.sql`.
- *Stale docs:* the README table is out of ledger order, and `verify/README.md` has two stale lines.

## Low: tidy-ups

- **L1:** trigger functions are granted to `authenticated` in some migrations and revoked in others. Use one pattern.
- **L2:** `distance_m`, `trim_line_ends`, `require_editor` and `lock_rows` are security definer for no reason. Make them invoker.
- **L3:** `delete_my_account(delete_uploads default true)`: the default now always errors. Drop the parameter once phones update.
- **L4:** `route_variant_route_id_idx` duplicates the start of `route_variant_one_per_direction`.
- **L5:** two read rules per table (`*_read_approved` and `*_read_editor`) could be one.
- **L6:** two vehicle vocabularies: `transport_mode` says `jeepney`, `contribution.vehicle` says `jeep`.
- **L7:** with drafts on, removed signboard files are never deleted from the bucket.
- **L8:** `draft`, `takedown` and `contribution_use` point at "a route or a hotspot" through `subject_id` with no foreign key. A hard-deleted direction leaves `contribution_use` rows behind.
- **L9:** names that disagree with CONTEXT.md. Note only; renames are expensive.
  - `stop` is the hotspot, `route_variant` the direction, `route_stop` the link.
  - `owner_id` collides with the glossary's Owner.
  - `kind` values differ between `draft`/`takedown` and `contribution_use`.
  - Migration headers still say ParaPo.
- **L10:** the generated types haven't drifted. About 1,270 of their 2,186 lines are the monthly `point_batch` pieces.

## What Draft ↔ Published needs

**Already there:**
- Published = `status = 'approved'` on `route` and `stop`.
- Draft = a `draft` row exists, or a new route that exists only as a draft.
- The draft's maker is `draft.editor_id`.

**What doesn't fit:**
- `route.owner_id` is the approver, never updated, so it can't be Author.
- `updated_at` moves with neighbours' links, and `status_at` only on a status change, so neither can be Date published.

**Missing:**
- On `route` and `stop`: `published_at`, `published_by`, `last_saved_by` and `last_saved_at`, written at approval from `draft.editor_id`. A backfill for existing rows, from `status_at` and `owner_id`, labelled approximate.
- `publish_draft(draft, revision)`: approves straight from a draft and keeps the conflict check. It replaces submit, approve and approve_reviewed.
- `unpublish(kind, id)`: takes it down and leaves a draft of it. The hotspot-ends-a-route guard stays.
- Then retire `draft.status`, `submitted_at`, `submit_draft`, `send_back_draft` and probably `note`.
- ADR 0003 and the CONTEXT.md entries amended in the same PR.

## Suggested clean-up order

1. **Protect uploads (H2):** one migration and a verify script.
2. **Remove the `STUDIO_DRAFTS` flag and the direct-write code (M1):** an app PR, with CI moved to drafts.
3. **Draft ↔ Published:** one migration.
   - Add the publish and author columns, with a backfill.
   - Add `publish_draft`, `unpublish` and `save_draft`.
   - Revoke the old approval, submit and send-back functions and direct draft updates (H3, M2, M3).
   - The studio PR alongside, with the ADR 0003 and CONTEXT.md amendments.
4. **Lock the map tables (H1):** revoke direct writes on `route`, `route_variant`, `stop` and `route_stop`.
5. **Drop dead weight (M4, L1, L2, L4, L5):** `gps_session`, the never-written columns, the duplicate index, the merged read rules, and the grant and definer tidy-ups. Fix `route_code` if trains need it.
6. **Repo hygiene (M6):** a schema-only snapshot as one baseline file (`pg_dump --schema-only`, applying nothing), the unapplied file moved out, the READMEs fixed, and one naming scheme so file names match ledger versions.
