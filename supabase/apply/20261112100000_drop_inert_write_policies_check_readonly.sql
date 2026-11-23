-- ParaPo — the read-only check after applying the drop_inert_write_policies migration: the one the
-- owner runs on the live project. It reads the catalog and the ledger and writes nothing: one row
-- per check, every ok should be t. The behaviour check that adds and rolls back test rows is
-- _check_full.sql, for the throwaway database of verify/drop-inert-write-policies.sh only.

select * from (values
  (1, 'route, route_variant, stop and route_stop have read policies only',
   (select count(*) = 0 from pg_policies
      where schemaname = 'public' and tablename in ('route', 'route_variant', 'stop', 'route_stop')
        and cmd <> 'SELECT')),
  (2, 'each keeps its two read policies, and takedown its two',
   (select count(*) = 10 from pg_policies
      where schemaname = 'public' and cmd = 'SELECT'
        and policyname in ('route_read_approved', 'route_read_editor', 'route_variant_read_approved',
          'route_variant_read_editor', 'stop_read_approved', 'stop_read_editor', 'route_stop_read_approved',
          'route_stop_read_editor', 'takedown_read_editor', 'takedown_read_public'))),
  (3, 'row level security is on for all four',
   (select bool_and(relrowsecurity) from pg_class
      where oid in ('public.route'::regclass, 'public.route_variant'::regclass, 'public.stop'::regclass,
        'public.route_stop'::regclass))),
  (4, 'anon and authenticated write none of them',
   (select bool_and(not has_table_privilege(r, t, 'insert') and not has_table_privilege(r, t, 'update')
                    and not has_table_privilege(r, t, 'delete'))
      from unnest(array['public.route', 'public.route_variant', 'public.stop', 'public.route_stop']) t,
           unnest(array['anon', 'authenticated']) r)),
  (5, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'drop_inert_write_policies'))
) as c(n, what, ok) order by n;
