-- Every function in public or private that the anon role may run, after every applied migration.
-- It should list none: nothing in the app is called without a session, and a function left to
-- anon is one more thing a stranger with the publishable key can call. A Supabase project hands
-- each new function in public to anon by default (bootstrap.sql does the same), so a migration
-- must take it back from anon by name; taking it back from PUBLIC alone is not enough.
-- supabase/verify/schema-snapshot.sh fails on any row.
--
-- Left out, each with its reason:
--   - trigger functions: Postgres refuses to run one outside a trigger, and PostgREST offers none.
select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
  and p.prorettype <> 'trigger'::regtype
  and has_function_privilege('anon', p.oid, 'execute')
order by 1;
