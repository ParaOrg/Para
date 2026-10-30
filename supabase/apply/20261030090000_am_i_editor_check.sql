-- ParaPo — read-only checks after applying am_i_editor. One row per check;
-- every ok should be t.
select * from (values
  (1, 'public.am_i_editor() exists and returns boolean',
   (select count(*) = 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'am_i_editor' and p.pronargs = 0
       and p.prorettype = 'boolean'::regtype)),
  (2, 'it runs as the caller (security invoker), with its search_path pinned',
   (select not p.prosecdef and p.proconfig @> array['search_path=""']
      from pg_proc p where p.oid = 'public.am_i_editor()'::regprocedure)),
  (3, 'signed-in users may call it',
   has_function_privilege('authenticated', 'public.am_i_editor()', 'execute')),
  (4, 'visitors may not',
   not has_function_privilege('anon', 'public.am_i_editor()', 'execute')),
  (5, 'signed-in users can reach 0005''s check it runs as the caller (usage on private, execute on is_editor)',
   has_schema_privilege('authenticated', 'private', 'usage')
     and has_function_privilege('authenticated', 'private.is_editor()', 'execute')),
  (6, 'the ledger has the row',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'am_i_editor'))
) as c(n, check_name, ok) order by n;
