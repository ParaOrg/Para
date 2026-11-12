# Migrations

The files here are numbered `0001` to `0018`, then `0021` and `0022`; from
`20261018112757_reviewed_draft_approval.sql` on they carry the ledger's own timestamp in their
names. `0019` and `0020` were never written under those numbers: they became the timestamped
`contributions` and `backup_reader` files (`.scratch/contribute/database.md` §10 has the original
order). The project's ledger,
`supabase_migrations.schema_migrations`, is timestamped. This table says which
ledger version each file is. Nothing here is applied by a session: the owner
applies each file, one at a time, and regenerates `src/shared/types/database.types.ts`
after every one.

| File | Ledger version | Ledger name | Note |
| --- | --- | --- | --- |
| `0001_init.sql` | `20260907000001` | `0001_init` | Applied by hand before the ledger was used, so its version is made up to sort before 0004's |
| `0002_pin_function_search_path.sql` | `20260907000002` | `0002_pin_function_search_path` | As 0001 |
| `0003_rls_performance.sql` | `20260908000003` | `0003_rls_performance` | As 0001 |
| `0004_stop_hotspot.sql` | `20260912135400` | `0004_stop_hotspot` | |
| `0005_editor_role.sql` | `20260914172324` | `0005_editor_role` | |
| `0006_route_ends.sql` | `20260921063300` | `0006_route_ends` | |
| `0007_stop_names.sql` | `20260921072803` | `0007_stop_names` | |
| `0008_route_borrow.sql` | `20260925072857` | `0008_route_borrow` | |
| `0009_overview.sql` | `20260930012129` | `0009_overview` | |
| `0010_signboards.sql` | `20261001164254` | `0010_signboards` | |
| `0011_rail.sql` | `20261002163358` | `0011_rail` | |
| `0012_ferry.sql` | `20261003095502` | `0012_ferry` | |
| `0013_hotspot_points.sql` | `20261016132706` | `0013_hotspot_points` | Ledger order is 0015, 0013, 0014: the order they were applied |
| `0014_terminal_place_unique.sql` | `20261016132957` | `0014_terminal_place_unique` | Only its create ran; 0016 is its drop |
| `0015_shared_editing.sql` | `20261014072047` | `0015_shared_editing` | Applied before 0013 and 0014 |
| `0016_finish_terminal_index.sql` | `20261017052153` | `0016_finish_terminal_index` | Drops the index 0014 meant to drop |
| `0017_anon_writes_revoked.sql` | `20261017091759` | `0017_anon_writes_revoked` | `anon` loses its writes; a new table grants nothing by default |
| `0018_review.sql` | `20261018054405` | `0018_review` | Approved / taken-down rows, drafts, takedowns, editor names; public reads approved only. Checked with `supabase/verify/`; applied with `supabase/apply/` |
| `0022_draft_ops.sql` | `20261018085951` | `0022_draft_ops` | Review operations RPCs: claim/submit/send-back/approve/discard drafts, take-down/put-back. Applied by the owner with `supabase/apply/0022_apply.sql`; do not reapply |
| `20261018112757_reviewed_draft_approval.sql` | `20261020034722` | `reviewed_draft_approval` | Revision-checked approval and explicit conflict resolution. Applied by the owner on 2026-10-20 with `supabase/apply/20261018112757_reviewed_draft_approval_apply.sql`; `_check.sql` 6/6 true. Do not reapply |
| `0021_loops.sql` | `20261018020203` | `0021_loops` | A loop: no head or tail, one direction, called by its signboard |
| `20261019125900_contributions.sql` | `20261019144009` | `contributions` | Contributor uploads: `contributor`, `contribution`, `point_batch` (monthly pieces), `hinto`, `save_contribution`. The tables of `.scratch/contribute/database.md` §3 that the first upload needs (the planned "0019"). Applied by the owner on 2026-10-19 from #289's paste file (with editor delete, hide and row security on every piece); `_check.sql` 10/10 true. Do not reapply |
| `20261022090000_contribution_use.sql` | `20261023024013` | `contribution_use` | `contribution_use`, editor `public.block_contributor` / `unblock_contributor`, `private.retire_month` and `private.add_months`. Finishes ticket contribute/08. Applied by the owner on 2026-10-23 from #353's paste file; `_check.sql` 8/8 true. Do not reapply |
| `20261022100000_backup_reader.sql` | — | — | **Not applied live.** Login role `backup_reader` (SELECT and a read policy on the contributor and route tables, never `private.editor`) for the weekly R2 backup; `private.grant_backup_reader()` covers new monthly pieces. The owner sets its password. Ticket contribute/15 |
| `20261023090000_signup_hook.sql` | `20261023035741` | `signup_hook` | `private.before_user_created`, a Before User Created hook that refuses every sign-up that isn't anonymous, so "Allow new users to sign up" can go on for phones. Ticket contribute/09. Applied by the owner on 2026-10-23 from #356's paste file; `_check.sql` 8/8 true. Do not reapply |
| `20261024090000_contributor_accounts.sql` | `20261024174511` | `contributor_accounts` | `contributor.name` / `phone` / `profile_updated_at`, `public.set_profile`, `get_profile`, `begin_claim`, `finish_claim`, `private.claim_token`. Contributor accounts ticket 01. Applied by the owner from its paste file. Do not reapply |
| `20261026090000_draft_update_own.sql` | `20261031041538` | `draft_update_own` | `draft_update` narrowed to the draft's maker (or a draft whose maker is gone); the review functions are unaffected. Studio-maps ticket 05. Applied by the owner from its paste file. Do not reapply |
| `20261030090000_am_i_editor.sql` | `20261031041437` | `am_i_editor` | `public.am_i_editor()`: whether the signed-in account is on the editor list, about the caller alone (security invoker over `private.is_editor()`). The studio turns other accounts away at sign-in. Applied by the owner from its paste file. Do not reapply |
| `20261031090000_account_stats.sql` | `20261031104413` | `account_stats` | `contribution.walk_m` / `ride_m` / `walk_s` / `ride_s` (the phone's walk and ride split, optional keys of `save_contribution`), `private.contributor_retired_totals` (filled by `private.retire_month` before it unlinks a month; moved by `finish_claim`), `public.get_my_stats()`. Needs `contributor_accounts` first. Applied by the owner on 2026-10-31 from its paste file; its check passed. Do not reapply |
| `20261031100000_delete_my_account.sql` | `20261031104504` | `delete_my_account` | `public.delete_my_account()`: a signed-in contributor deletes their own auth user, and their contributor row, contributions, points, hintos, uses, retired totals and claim tokens go through the existing cascades. Refuses anonymous phones, editors and an account still owning map rows; answers a user already gone as deleted; lets `contribution_hide_stamp` null `hidden_by` once that user is gone. Needs `account_stats` first. Applied by the owner on 2026-10-31 from its paste file; its check passed. Do not reapply |
| `20261031110000_contribution_fare.sql` | `20261031104536` | `contribution_fare` | `contribution.fare_php` (numeric(7,2), 0 to 2000, an optional key of `save_contribution`), the retired totals' `fare_php_total` / `fare_recordings`, and `get_my_stats()` returning both; `contribution.vehicle` also `e_jeep` and `uv_express`, counted as `e_jeep_rides` / `uv_express_rides`. Needs `account_stats` first. Applied by the owner on 2026-10-31 from its paste file; its check passed. Do not reapply |
| `20261101090000_delete_account_keep_uploads.sql` | `20261101134845` | `delete_account_keep_uploads` | `public.delete_my_account(delete_uploads boolean default true)` replaces `delete_my_account()`: with `false` the account's contributions are unlinked (`contributor_id` null, new `contribution.unlinked` marked, typed words cleared) and stay with their points, hintos and uses, while the person (user, contributor row, retired totals, claim tokens, GoTrue's audit log entries) goes; with `true` or no argument, as before. `private.retire_month` also retires a ride marked `unlinked` and clears the mark. Needs `delete_my_account` first. Applied by the owner on 2026-11-05 from its paste file; its check passed. Do not reapply |
| `20261105090000_delete_account_refuse_uploads.sql` | `20261105033302` | `delete_account_refuse_uploads` | `public.delete_my_account(delete_uploads boolean default true)`, same signature, now refuses anything but `false` before it locks or changes anything: `true`, null or no argument (the apps already on phones) raise P0001 `delete_uploads_refused: …` and the account stays whole. `false` is unchanged from 20261101090000. Deleting an account never deletes the uploads. Needs `delete_account_keep_uploads` first. Applied by the owner on 2026-11-05 from its paste file; its check passed. Do not reapply |
| `20261105120000_review_rules.sql` | `20261105042846` | `review_rules` | The review step's rules (findings studio-03, 08, 09): `approve_draft` writes only the links that differ, so an unchanged link bumps no neighbour's revision; `refresh_draft_base` (Keep) rebuilds a hotspot draft's computed links from the approved directions' links when the draft keeps the approved outline and line, keeping a terminal's ticked links; `authenticated` updates only `draft.payload`, `status`, `submitted_at` and `note`; `draft_update`'s with check needs the maker; only the maker discards (`discard_draft` answers `not_your_draft`, `draft_delete` is the maker's), and a draft whose maker is gone is discarded by any editor. Needs `draft_update_own` first. Applied by the owner on 2026-11-05 from its paste file; its check passed. Do not reapply |
| `20261105130000_draft_update_makerless.sql` | `20261105055623` | `draft_update_makerless` | `draft_update`'s with check accepts a maker-less draft again (the maker, or `editor_id` null), as `draft_update_own` had it, so any editor may edit a draft whose maker's account is gone (the owner's choice). `editor_id` stays outside the update grant (review_rules), so a draft still cannot be handed to nobody. After it, `review_rules`' check no longer holds on that one point. Needs `review_rules` first. Applied by the owner on 2026-11-05 from its paste file; its check passed. Do not reapply |
| `20261105180000_keep_uploads_on_user_delete.sql` | `20261105131416` | `keep_uploads_on_user_delete` | `private.unlink_contributions()` and the trigger `contributor_unlink_contributions` (before delete on `contributor`): deleting a user anywhere (the dashboard, a script, an anonymous clean-up) or a contributor row unlinks their rides first, as `delete_my_account(false)` does, instead of cascading them away (review H2). Needs `delete_account_keep_uploads` first. Applied by the owner on 2026-11-05 from its paste file; its check passed. Do not reapply |
| `20261105160000_draft_published.sql` | `20261105132206` | `draft_published` | Draft and Published (ADR 0003, amendment 2026-11-05). `route` and `stop`: `published_at`, `published_by`, `last_saved_at`, `last_saved_by`, backfilled **approximately** from `status_at` and `owner_id` (a taken-down row gets no publish date; no revision moves). `draft.last_saved_by` and its trigger `draft_saver`. `public.save_draft`, `public.publish_draft` (publishes from a draft with the revision and base checks, stamps the columns; `published_by` is the draft's maker), `public.unpublish` (take-down that leaves a draft), `private.apply_draft` (the one body that applies a draft; `approve_draft` now calls it) and `private.payload_of`. The old review path keeps its grants. Needs `draft_update_makerless` first. Applied by the owner on 2026-11-05 from its paste file; its check passed. Do not reapply |
| `20261105190000_lock_map_tables.sql` | `20261106022456` | `lock_map_tables` | Editors lose the direct insert, update and delete on `route`, `route_variant`, `stop` and `route_stop` (review H1): the map changes only through the draft functions. Select stays; the 0005/0015 write policies stay, inert. Needs `draft_published` first. Applied by the owner on 2026-11-06 from its paste file; its check passed. Do not reapply |
| `20261105200000_drop_dead_weight.sql` | `20261106022531` | `drop_dead_weight` | Drops `gps_session` (with `delete_my_account` redefined without it), `route.short_name`, `route.fare_as_of` and `route_variant_route_id_idx` (review M4, L4). Its apply refuses while `gps_session` has a row or either column holds a value. Needs `keep_uploads_on_user_delete` first. Applied by the owner on 2026-11-06 from its paste file; its check passed. Do not reapply |
| `20261106090000_my_contribution_uses.sql` | `20261106090000` | `my_contribution_uses` | `public.get_my_uses()`: which of the signed-in contributor's rides an editor used, and the name of the approved route or hintuan it became, for the History card's "On the map" line (#674, by Simonee). Read-only; `authenticated` only. Applied by the owner on 2026-11-06 via Supabase's SQL Editor, which does not write the migrations ledger, so the version is recorded by hand. Do not reapply |
| `20261110190000_retire_review_steps.sql` | `20261111173006` | `retire_review_steps` | Drops `approve_draft`, `approve_reviewed_draft`, `submit_draft` and `send_back_draft`; revokes the direct update of a draft and drops `draft_update` (H3, M2). Needs `draft_published` first. Applied by the owner on 2026-11-11 from its paste file; its check passed (4 rows, all `t`). Do not reapply |

Create new files with `supabase migration new <name>`; the CLI supplies a timestamped filename. Leave the existing numbered files unchanged. Record the ledger version the project actually assigns after the owner approves and applies a migration. Until then, mark its row **not applied live**.

## The schema in one file

`supabase/schema/snapshot.sql` is the schema as every applied migration leaves it, in one file to read. Read
it to see what a table, function or rule is now. It is never applied; changes still go through a migration
here. `supabase/verify/schema-snapshot.sh` rebuilds it in ledger order and fails CI when it is out of date.
When a migration is recorded as applied, add it to that script's `APPLIED` list and rewrite the snapshot
(`--write`) in the same change.

## Applying a file from the SQL editor

The dashboard's SQL editor runs a file but does not write the ledger, so add
its row in the same run, under the file's name:

```sql
-- the file's statements, then:
insert into supabase_migrations.schema_migrations (version, name, statements)
select to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'), '00NN_example', '{}'
where not exists (
  select 1 from supabase_migrations.schema_migrations where name = '00NN_example'
);
```

Keep the editor's role on `postgres`, and paste the file and the insert as one
run. The insert adds the row only once, so pasting the whole run twice is safe
(the file's statements must be safe to repeat too).

`list_migrations` (or `select version, name from supabase_migrations.schema_migrations order by version`)
should then show every file here, each under its own name.

## Grants for new tables

Since 0017 a new table in `public` gets no grants for `anon` or `authenticated`
until its migration adds them, so a forgotten grant fails closed. Use identity
columns (`generated always as identity`) rather than `serial`: a `serial`
column's sequence needs its own `grant usage on sequence`.
