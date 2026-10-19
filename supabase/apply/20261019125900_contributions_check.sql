-- ParaPo — read-only checks after applying the contributions migration. One row
-- per check; every ok should be t.
with t(oid) as (values ('public.contributor'::regclass), ('public.contribution'::regclass),
  ('public.point_batch'::regclass), ('public.hinto'::regclass)),
pieces as (select c.oid from pg_class c where c.relnamespace = 'public'::regnamespace
  and (c.relname in ('contributor', 'contribution', 'hinto') or c.relname like 'point\_batch%')
  and c.relkind in ('r', 'p'))
select * from (values
  (1, 'the four tables exist with row security on',
   (select count(*) = 4 and bool_and(relrowsecurity) from pg_class where oid in (select oid from t))),
  (2, 'point_batch has 27 monthly pieces and a default',
   (select count(*) = 28 from pg_inherits where inhparent = 'public.point_batch'::regclass)),
  (3, 'anon reads and writes none of it, pieces included',
   (select not bool_or(has_table_privilege('anon', oid, 'select') or has_table_privilege('anon', oid, 'insert')
      or has_table_privilege('anon', oid, 'delete')) from pieces)),
  (4, 'authenticated updates nothing but the hide columns',
   (select not bool_or(has_table_privilege('authenticated', oid, 'update')) from pieces)
     and has_column_privilege('authenticated', 'public.contribution', 'hidden_at', 'update')
     and not has_column_privilege('authenticated', 'public.contribution', 'description', 'update')
     and not has_column_privilege('authenticated', 'public.contribution', 'hidden_by', 'update')),
  (5, 'authenticated reaches the monthly pieces only through point_batch',
   (select not bool_or(has_table_privilege('authenticated', c.oid, 'select'))
      from pg_class c where c.relname like 'point\_batch\_%' and c.relnamespace = 'public'::regnamespace)),
  (10, 'every monthly piece and the default have row security on',
   (select count(*) = 28 and bool_and(c.relrowsecurity) from pg_inherits i
      join pg_class c on c.oid = i.inhrelid where i.inhparent = 'public.point_batch'::regclass)),
  (6, 'save_contribution: invoker, pinned path, authenticated only',
   (select not prosecdef and proconfig @> array['search_path=""']
      and has_function_privilege('authenticated', oid, 'execute')
      and not has_function_privilege('anon', oid, 'execute')
      and not has_function_privilege('public', oid, 'execute')
      from pg_proc where oid = 'public.save_contribution(jsonb)'::regprocedure)),
  (7, 'the private helpers are definers with a pinned path, out of anon''s reach',
   (select count(*) = 5 and bool_and(prosecdef and proconfig @> array['search_path=""']
      and not has_function_privilege('anon', oid, 'execute'))
      from pg_proc where pronamespace = 'private'::regnamespace and proname in
      ('can_contribute', 'contributor_stamp', 'contribution_stamp', 'point_batch_stamp', 'hinto_cap'))
     and (select prosecdef from pg_proc where oid = 'private.contribution_hide_stamp()'::regprocedure)),
  (8, 'the four insert triggers and the hide trigger are enabled',
   (select count(*) = 5 from pg_trigger where not tgisinternal and tgenabled = 'O' and tgname in
      ('contributor_stamp', 'contribution_stamp', 'point_batch_stamp', 'hinto_cap', 'contribution_hide_stamp')
      and tgrelid in (select oid from t))),
  (9, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'contributions'))
) as c(n, what, ok) order by n;
