-- ParaPo — read-only checks after applying reviewed_draft_approval. One row per
-- check; every ok should be t.
with fn as (
  select p.oid, p.proname, p.prosecdef, p.proconfig from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('approve_reviewed_draft', 'refresh_draft_base')
)
select * from (values
  (1, 'both functions exist, once each',
   (select count(*) = 2 and count(distinct proname) = 2 from fn)),
  (2, 'both are security definer with search_path pinned',
   (select bool_and(prosecdef and proconfig @> array['search_path=""']) from fn)),
  (3, 'anon and PUBLIC cannot execute them',
   (select not bool_or(has_function_privilege('anon', oid, 'execute')
                       or has_function_privilege('public', oid, 'execute')) from fn)),
  (4, 'authenticated can (each still refuses anyone not an editor)',
   (select bool_and(has_function_privilege('authenticated', oid, 'execute')) from fn)),
  (5, '0022''s approve_draft is still there, unchanged in signature',
   (to_regprocedure('public.approve_draft(uuid)') is not null)),
  (6, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'reviewed_draft_approval'))
) as c(n, what, ok) order by n;
