# Migrations

The files here are numbered (`0001` to `0018`, then `0021`; `0019` and `0020` are planned, `.scratch/contribute/database.md` §10). The project's ledger,
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
| `20261024090000_contributor_accounts.sql` | _not applied yet_ | `contributor_accounts` | `contributor.name` / `phone` / `profile_updated_at`, `public.set_profile`, `get_profile`, `begin_claim`, `finish_claim`, `private.claim_token`. Contributor accounts ticket 01. Written, not applied: the owner applies it from its paste file, then records the ledger version here |
| `20261026090000_draft_update_own.sql` | _not applied yet_ | `draft_update_own` | `draft_update` narrowed to the draft's maker (or a draft whose maker is gone); the review functions are unaffected. Studio-maps ticket 05. Written, not applied: the owner applies it from its paste file, then records the ledger version here |
| `20261030090000_am_i_editor.sql` | _not applied yet_ | `am_i_editor` | `public.am_i_editor()`: whether the signed-in account is on the editor list, about the caller alone (security invoker over `private.is_editor()`). The studio turns other accounts away at sign-in. Written, not applied: the owner applies it from its paste file, then records the ledger version here |
| `20261031090000_account_stats.sql` | _not applied yet_ | `account_stats` | `contribution.walk_m` / `ride_m` / `walk_s` / `ride_s` (the phone's walk and ride split, optional keys of `save_contribution`), `private.contributor_retired_totals` (filled by `private.retire_month` before it unlinks a month; moved by `finish_claim`), `public.get_my_stats()`. Needs `contributor_accounts` first. Written, not applied: the owner applies it from its paste file, before the app that sends the split ships, then records the ledger version here |
| `20261031110000_contribution_fare.sql` | _not applied yet_ | `contribution_fare` | `contribution.fare_php` (numeric(7,2), 0 to 2000, an optional key of `save_contribution`), the retired totals' `fare_php_total` / `fare_recordings`, and `get_my_stats()` returning both. Needs `account_stats` first. Written, not applied: the owner applies it from its paste file, then records the ledger version here |

Create new files with `supabase migration new <name>`; the CLI supplies a timestamped filename. Leave the existing numbered files unchanged. Record the ledger version the project actually assigns after the owner approves and applies a migration. Until then, mark its row **not applied live**.

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
