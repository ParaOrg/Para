-- ParaPo — read-only checks after applying the contributor_accounts migration.
-- One row per check; every ok should be t. Privileges are read with
-- has_column_privilege / has_function_privilege, which count PUBLIC and
-- inherited grants.
select * from (values
  (1, 'contributor has name, phone and profile_updated_at, all nullable',
   (select count(*) = 3 and bool_and(is_nullable = 'YES') from information_schema.columns
      where table_schema = 'public' and table_name = 'contributor'
        and column_name in ('name', 'phone', 'profile_updated_at'))),
  (2, 'authenticated reads the name but not the phone',
   (select has_column_privilege('authenticated', 'public.contributor', 'name', 'select')
      and not has_column_privilege('authenticated', 'public.contributor', 'phone', 'select'))),
  (3, 'authenticated inserts only the id, and updates nothing',
   (select has_column_privilege('authenticated', 'public.contributor', 'id', 'insert')
      and not has_column_privilege('authenticated', 'public.contributor', 'name', 'insert')
      and not has_column_privilege('authenticated', 'public.contributor', 'phone', 'insert')
      and not has_table_privilege('authenticated', 'public.contributor', 'update'))),
  (4, 'anon reaches nothing of contributor',
   (select not (has_table_privilege('anon', 'public.contributor', 'select')
      or has_column_privilege('anon', 'public.contributor', 'phone', 'select')
      or has_table_privilege('anon', 'public.contributor', 'insert')))),
  (5, 'the four public functions are definers with a pinned path, for authenticated only',
   (select count(*) = 4 and bool_and(prosecdef and proconfig @> array['search_path=""']
      and has_function_privilege('authenticated', oid, 'execute')
      and not has_function_privilege('anon', oid, 'execute')
      and not has_function_privilege('public', oid, 'execute'))
      from pg_proc where oid in ('public.set_profile(text, text)'::regprocedure,
        'public.get_profile()'::regprocedure, 'public.begin_claim()'::regprocedure,
        'public.finish_claim(uuid)'::regprocedure))),
  (6, 'private.is_account is a definer with a pinned path, out of anon''s reach',
   (select prosecdef and proconfig @> array['search_path=""']
      and has_function_privilege('authenticated', oid, 'execute')
      and not has_function_privilege('anon', oid, 'execute')
      and not has_function_privilege('public', oid, 'execute')
      from pg_proc where oid = 'private.is_account()'::regprocedure)),
  (7, 'private.claim_token has row security on and no API grant',
   (select relrowsecurity from pg_class where oid = 'private.claim_token'::regclass)
     and not (has_table_privilege('anon', 'private.claim_token', 'select')
       or has_table_privilege('authenticated', 'private.claim_token', 'select')
       or has_table_privilege('authenticated', 'private.claim_token', 'insert'))),
  (8, 'the contribution policies and save_contribution are as before',
   (select count(*) = 4 from pg_policies where schemaname = 'public' and tablename = 'contribution'
      and policyname in ('phone adds its own', 'phone or editor reads', 'phone or editor deletes', 'editors hide'))
     and to_regprocedure('public.save_contribution(jsonb)') is not null),
  (9, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'contributor_accounts'))
) as c(n, what, ok) order by n;
