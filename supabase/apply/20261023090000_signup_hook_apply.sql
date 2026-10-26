-- ParaPo — apply 20261023090000_signup_hook.sql to the live project, in one run.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it once.
-- It is one transaction: it checks the project first, applies
-- supabase/migrations/20261023090000_signup_hook.sql (copied below unchanged), checks the
-- result, and writes the ledger row. If any check fails it raises, and nothing
-- at all is changed, ledger included. A second run stops at step 1 and changes
-- nothing.
-- Afterwards: supabase/apply/20261023090000_signup_hook_check.sql (read-only), then select the
-- hook in the dashboard (supabase/apply/README.md). Undo: 20261023090000_signup_hook_revert.sql.
--
-- Adds one function and a schema grant; touches no table and no row. Nothing
-- changes for anyone until the hook is selected in the dashboard.

begin;

-- 1. Before: this has not run, and the auth service's role exists.
do $$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'signup_hook') then
    raise exception 'signup_hook: already applied. Nothing was changed.';
  end if;
  if to_regprocedure('private.before_user_created(jsonb)') is not null then
    raise exception 'signup_hook: private.before_user_created already exists. Nothing was changed.';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    raise exception 'signup_hook: role supabase_auth_admin is missing. Nothing was changed.';
  end if;
end $$;

-- >>> supabase/migrations/20261023090000_signup_hook.sql, unchanged
-- ParaPo — signup_hook, a Before User Created hook that lets only anonymous sign-ups through
--
-- Ticket contribute/09, .scratch/contribute/database.md section 2 (fix 3).
-- Production has anonymous sign-ins on and "Allow new users to sign up" off,
-- and GoTrue refuses an anonymous sign-up while sign-ups are off (422 on
-- /auth/v1/signup), so no phone can sign in. Sign-ups must go on, but then
-- anyone could make an email account. This hook runs before every new user is
-- created and refuses all but the anonymous ones.
--
-- Supabase's Before User Created hook contract (Auth Hooks docs, "Before User
-- Created Hook"), as relied on here:
--   input   {"metadata": {"uuid", "time", "ip_address", "name": "before-user-created"},
--            "user": {"id", "aud", "role", "email", "phone", "app_metadata",
--                     "user_metadata", "identities", "created_at", "updated_at",
--                     "is_anonymous": <boolean>}}
--           "The user record is not yet in Postgres when the hook runs."
--   allow   return {} (HTTP 200)
--   refuse  return {"error": {"http_code": 4xx, "message": "..."}}; the
--           message is passed to the client. The docs' own SQL example refuses
--           with http_code 403.
--   grants  grant execute on the function to supabase_auth_admin and revoke it
--           from authenticated, anon and public.
--
-- Only an event whose user.is_anonymous is true passes. A missing or null flag
-- is refused: the hook fails closed.
--
-- The function lives in private, which no API role can reach; the auth service
-- runs as supabase_auth_admin, so that role gets usage on the schema and
-- execute on this one function, nothing else. No security definer: it reads
-- only its argument.
--
-- The owner's steps are in supabase/apply/README.md: apply, check, select the
-- hook under Authentication, Hooks, and only then turn sign-ups on.
--
-- Written, not applied: the owner applies it.

create function private.before_user_created(event jsonb)
returns jsonb language plpgsql set search_path = '' as $$
begin
  if coalesce((event -> 'user' ->> 'is_anonymous')::boolean, false) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Sign-ups are closed. Contributors sign in anonymously.'));
end $$;

grant usage on schema private to supabase_auth_admin;
revoke all on function private.before_user_created(jsonb) from public, anon, authenticated;
grant execute on function private.before_user_created(jsonb) to supabase_auth_admin;
-- <<< supabase/migrations/20261023090000_signup_hook.sql

-- 2. After: the function behaves, and only the auth service can run it.
do $$
begin
  if private.before_user_created('{"user": {"is_anonymous": true}}'::jsonb) <> '{}'::jsonb then
    raise exception 'signup_hook: an anonymous sign-up is not allowed. Nothing was changed.';
  end if;
  if private.before_user_created('{"user": {"is_anonymous": false, "email": "a@b.co"}}'::jsonb) -> 'error' ->> 'http_code' is distinct from '403' then
    raise exception 'signup_hook: an email sign-up is not refused. Nothing was changed.';
  end if;
  if not has_function_privilege('supabase_auth_admin', 'private.before_user_created(jsonb)', 'execute')
     or has_function_privilege('anon', 'private.before_user_created(jsonb)', 'execute')
     or has_function_privilege('authenticated', 'private.before_user_created(jsonb)', 'execute')
     or has_function_privilege('public', 'private.before_user_created(jsonb)', 'execute') then
    raise exception 'signup_hook: wrong execute privileges. Nothing was changed.';
  end if;
end $$;

-- 3. The ledger row, once.
insert into supabase_migrations.schema_migrations (version, name, statements)
select greatest(to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
                (select (max(version)::bigint + 1)::text from supabase_migrations.schema_migrations
                 where version ~ '^[0-9]{14}$')),
       'signup_hook', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'signup_hook');

commit;
