# Migrations

The files here are numbered (`0001` to `0016`). The project's ledger,
`supabase_migrations.schema_migrations`, is timestamped. This table says which
ledger version each file is. Nothing here is applied by a session: the owner
applies each file, one at a time, and regenerates `src/shared/types/database.types.ts`
after every one.

| File | Ledger version | Ledger name | Note |
| --- | --- | --- | --- |
| `0001_init.sql` | `20260907000001` | `0001_init` | Applied by hand in September; recorded afterwards by the SQL in the ticket's PR |
| `0002_pin_function_search_path.sql` | `20260907000002` | `0002_pin_function_search_path` | As 0001 |
| `0003_rls_performance.sql` | `20260908000003` | `0003_rls_performance` | As 0001 |
| `0004_stop_hotspot.sql` | `20260912135400` | `0004_stop_hotspot` | Recorded as `stop_hotspot`; renamed by the ledger SQL |
| `0005_editor_role.sql` | `20260914172324` | `0005_editor_role` | Recorded as `editor_role`; renamed by the ledger SQL |
| `0006_route_ends.sql` | `20260921063300` | `0006_route_ends` | |
| `0007_stop_names.sql` | `20260921072803` | `0007_stop_names` | |
| `0008_route_borrow.sql` | `20260925072857` | `0008_route_borrow` | |
| `0009_overview.sql` | `20260930012129` | `0009_overview` | |
| `0010_signboards.sql` | `20261001164254` | `0010_signboards` | |
| `0011_rail.sql` | `20261002163358` | `0011_rail` | |
| `0012_ferry.sql` | `20261003095502` | `0012_ferry` | |
| `0013_hotspot_points.sql` | `20261016132706` | `0013_hotspot_points` | Ledger order is 0015, 0013, 0014: the order they were applied |
| `0014_terminal_place_unique.sql` | `20261016132957` | `0014_terminal_place_unique` | Only its create was applied; 0016 is its missing drop |
| `0015_shared_editing.sql` | `20261014072047` | `0015_shared_editing` | Applied before 0013 and 0014 |
| `0016_finish_terminal_index.sql` | not yet applied | | Drops 0014's old index (the drop 0014 did not run) |

A new file takes the next free number. Its ledger version is whatever
timestamp the project gives it when the owner applies it; add the row here in
the same change.

## The ledger catch-up

0001 to 0003 were applied by hand before the ledger was used, and 0004 and 0005
were recorded under names without their numbers. Run once as `postgres`; it is
safe to run twice (the insert skips versions already there, and each rename
only matches the old name).

```sql
-- 0001 to 0003: applied by hand before the ledger was used. The versions sort before 0004's.
insert into supabase_migrations.schema_migrations (version, name, statements) values
  ('20260907000001', '0001_init', '{}'),
  ('20260907000002', '0002_pin_function_search_path', '{}'),
  ('20260908000003', '0003_rls_performance', '{}')
on conflict (version) do nothing;
-- 0004 and 0005 under their files' names.
update supabase_migrations.schema_migrations set name = '0004_stop_hotspot' where version = '20260912135400' and name = 'stop_hotspot';
update supabase_migrations.schema_migrations set name = '0005_editor_role' where version = '20260914172324' and name = 'editor_role';
```
