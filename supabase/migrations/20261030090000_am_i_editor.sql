-- ParaPo — "am I an editor?", for the studio's sign-in: public.am_i_editor().
--
-- Contributors and editors share one auth, so a contributor's account can sign
-- in to the studio. Row security already refuses their writes, but the studio
-- could not tell them so: private.is_editor() is not reachable through the API
-- (0005: `private` is not exposed). This answers the one question the studio
-- needs, about the caller alone, and nothing about anyone else.
--
-- Security invoker, not definer: authenticated may already execute
-- private.is_editor() (0005 grants it, for the policies), and the definer
-- there reads the list. So this function needs no rights of its own, and the
-- advisor's lints 0028/0029 (a security-definer function callable through the
-- API) do not apply. Visitors (anon) may not call it; signed-in users may.
--
-- Not applied by the session that wrote it: the owner applies it, as postgres,
-- from supabase/apply/20261030090000_am_i_editor_apply.sql, then records the
-- ledger version in migrations/README.md. Safe to run twice.
--
-- Reverse (supabase/apply/..._revert.sql does it and removes the ledger row):
--   drop function if exists public.am_i_editor();

create or replace function public.am_i_editor()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select private.is_editor()), false);
$$;

-- Postgres makes every new function executable by PUBLIC: take that away in
-- the same migration (0005), then give it to signed-in users only.
revoke all on function public.am_i_editor() from public, anon;
grant execute on function public.am_i_editor() to authenticated;
