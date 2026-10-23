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
