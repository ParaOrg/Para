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
| `20261018112757_reviewed_draft_approval.sql` | **not applied live** | `reviewed_draft_approval` | Revision-checked approval and explicit conflict resolution; verified only on disposable databases. Requires owner approval before live application |
| `0021_loops.sql` | `20261018020203` | `0021_loops` | A loop: no head or tail, one direction, called by its signboard |
| `20261019125900_contributions.sql` | **not applied live** | `contributions` | Contributor uploads: `contributor`, `contribution`, `point_batch` (monthly pieces), `hinto`, `save_contribution`. The tables of `.scratch/contribute/database.md` §3 that the first upload needs (the planned "0019"). Verified only on disposable databases (`verify/contributions.sh`). Requires owner approval before live application |

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
