-- ParaPo — read-only checks after applying the contribution_use migration. One
-- row per check; every ok should be t. Privileges are read with
-- has_*_privilege, which counts PUBLIC and inherited grants.
select * from (values
  (1, 'contribution_use exists with row security on',
   (select relrowsecurity from pg_class where oid = to_regclass('public.contribution_use'))),
  (2, 'anon holds nothing on it',
   (select not (has_table_privilege('anon', 'public.contribution_use', 'select')
      or has_table_privilege('anon', 'public.contribution_use', 'insert')
      or has_table_privilege('anon', 'public.contribution_use', 'update')
      or has_table_privilege('anon', 'public.contribution_use', 'delete')))),
  (3, 'authenticated may select, insert and delete, never update',
   (select has_table_privilege('authenticated', 'public.contribution_use', 'select')
      and has_table_privilege('authenticated', 'public.contribution_use', 'insert')
      and has_table_privilege('authenticated', 'public.contribution_use', 'delete')
      and not has_table_privilege('authenticated', 'public.contribution_use', 'update'))),
  (4, 'three policies, all for authenticated and all asking if the caller is an editor',
   (select count(*) = 3 and bool_and(roles = '{authenticated}'
      and coalesce(qual, '') || coalesce(with_check, '') like '%is_editor%')
      from pg_policies where schemaname = 'public' and tablename = 'contribution_use')),
  (5, 'the unique link and the two foreign-key indexes are there',
   (select count(*) = 3 from pg_indexes where schemaname = 'public' and tablename = 'contribution_use'
      and indexname in ('contribution_use_contribution_id_kind_subject_id_key',
                        'contribution_use_subject', 'contribution_use_editor'))),
  (6, 'block and unblock: definers, pinned path, authenticated only',
   (select count(*) = 2 and bool_and(prosecdef and proconfig @> array['search_path=""']
      and has_function_privilege('authenticated', oid, 'execute')
      and not has_function_privilege('anon', oid, 'execute')
      and not has_function_privilege('public', oid, 'execute'))
      from pg_proc where oid in ('public.block_contributor(uuid, text)'::regprocedure,
                                 'public.unblock_contributor(uuid)'::regprocedure))),
  (7, 'the five private helpers are definers with a pinned path, run by no API role',
   (select count(*) = 5 and bool_and(prosecdef and proconfig @> array['search_path=""']
      and not has_function_privilege('anon', oid, 'execute')
      and not has_function_privilege('public', oid, 'execute')
      and not has_function_privilege('authenticated', oid, 'execute'))
      from pg_proc where pronamespace = 'private'::regnamespace and proname in
      ('retire_month', 'add_months', 'distance_m', 'trim_line_ends', 'last_piece_month'))),
  (8, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'contribution_use'))
) as c(n, what, ok) order by n;
