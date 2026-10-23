-- ParaPo — read-only checks after applying the signup_hook migration. One row
-- per check; every ok should be t. Privileges are read with
-- has_function_privilege, which counts PUBLIC and inherited grants.
select * from (values
  (1, 'private.before_user_created(jsonb) exists',
   (select to_regprocedure('private.before_user_created(jsonb)') is not null)),
  (2, 'it has a pinned search path and is not a security definer',
   (select proconfig @> array['search_path=""'] and not prosecdef
      from pg_proc where oid = to_regprocedure('private.before_user_created(jsonb)'))),
  (3, 'supabase_auth_admin can run it and use the private schema',
   (select has_function_privilege('supabase_auth_admin', 'private.before_user_created(jsonb)', 'execute')
      and has_schema_privilege('supabase_auth_admin', 'private', 'usage'))),
  (4, 'anon, authenticated and PUBLIC cannot run it',
   (select not (has_function_privilege('anon', 'private.before_user_created(jsonb)', 'execute')
      or has_function_privilege('authenticated', 'private.before_user_created(jsonb)', 'execute')
      or has_function_privilege('public', 'private.before_user_created(jsonb)', 'execute')))),
  (5, 'an anonymous sign-up returns {}',
   (select private.before_user_created('{"user": {"is_anonymous": true, "email": null}}'::jsonb) = '{}'::jsonb)),
  (6, 'an email sign-up returns the 403 error object',
   (select private.before_user_created('{"user": {"is_anonymous": false, "email": "someone@example.com"}}'::jsonb)
      = jsonb_build_object('error', jsonb_build_object('http_code', 403,
          'message', 'Sign-ups are closed. Contributors sign in anonymously.')))),
  (7, 'an event with no flag is refused too',
   (select private.before_user_created('{"user": {"email": "someone@example.com"}}'::jsonb) ? 'error')),
  (8, 'the ledger row is there once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'signup_hook'))
) as c(n, what, ok) order by n;
