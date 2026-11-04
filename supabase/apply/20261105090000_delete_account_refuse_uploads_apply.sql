-- ParaPo — apply 20261105090000_delete_account_refuse_uploads.sql to the live project, in one run.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it once.
-- It is one transaction: it checks the project first, applies
-- supabase/migrations/20261105090000_delete_account_refuse_uploads.sql (copied below unchanged),
-- checks the result, and writes the ledger row. If any check fails it raises, and nothing at
-- all is changed, ledger included. A second run stops at step 1 and changes nothing.
-- Afterwards: supabase/apply/20261105090000_delete_account_refuse_uploads_check.sql (it adds test
-- users and rolls them back). The types do not change. Undo:
-- 20261105090000_delete_account_refuse_uploads_revert.sql.
--
-- Order: after 20261101090000_delete_account_keep_uploads (step 1 refuses without it), with it
-- or right after it.
--
-- Replaces the body of delete_my_account(delete_uploads boolean default true) so that only false
-- deletes an account; true, null or no argument is refused. No table, no row changes.

begin;

-- 1. Before: delete_account_keep_uploads is in the ledger and this has not run.
do $$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'delete_account_refuse_uploads') then
    raise exception 'delete_account_refuse_uploads: already applied. Nothing was changed.';
  end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where name = 'delete_account_keep_uploads')
     or to_regprocedure('public.delete_my_account(boolean)') is null then
    raise exception 'delete_account_refuse_uploads: 20261101090000_delete_account_keep_uploads is not applied here. Nothing was changed.';
  end if;
end $$;

-- >>> supabase/migrations/20261105090000_delete_account_refuse_uploads.sql, unchanged
-- ParaPo — Deleting an account never deletes the uploads:
-- public.delete_my_account(delete_uploads boolean default true), refusing anything but false.
--
-- The owner's rule (2026-11-04): deleting an account must never delete a contributor's
-- uploads. 20261101090000_delete_account_keep_uploads kept them only with
-- delete_uploads => false; with true, null or no argument it deleted them. Apps already on
-- phones still send those: 0.2.0 sends true when its "Also delete my uploaded routes" switch is
-- on, and older versions send no argument while their screens say the uploads are deleted.
--
-- Now:
--   delete_uploads = false          as 20261101090000: the person goes, the uploads stay,
--                                   unlinked (copied below unchanged).
--   true, null or no argument       refused before anything is locked or changed:
--                                   SQLSTATE P0001, message 'delete_uploads_refused: …'. The
--                                   account stays whole and the old app shows its usual
--                                   "couldn't delete", so nobody is told their uploads were
--                                   deleted when they were not.
--
-- Same signature and default as 20261101090000, so database.types.ts is unchanged and
-- PostgREST's rpc('delete_my_account') with no body still reaches this function (and is
-- refused) rather than answering that it does not exist. Same refusals after the new one,
-- definer, pinned path, authenticated only.
--
-- Order: after 20261101090000_delete_account_keep_uploads (step 1 of the apply refuses without
-- it), with it or right after it. Written, not applied: the owner applies it from
-- supabase/apply/20261105090000_delete_account_refuse_uploads_apply.sql.

create or replace function public.delete_my_account(delete_uploads boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare
  who uuid := (select auth.uid());
begin
  -- First, before any lock or change: only false deletes. True, null and no argument come from
  -- app versions that promise the uploads go with the account; refusing keeps that promise
  -- from being broken silently, and their screens show the usual "couldn't delete".
  if delete_uploads is distinct from false then
    raise exception 'delete_uploads_refused: only delete_uploads => false deletes an account; nothing was changed'
      using errcode = 'P0001';
  end if;
  if who is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  -- Locked first, so a claim or an upload of theirs committing meanwhile waits for this.
  perform 1 from auth.users where id = who for update;
  -- Gone already: an earlier call deleted it and its answer was lost.
  if not found then
    return;
  end if;
  perform 1 from public.contributor where id = who for update;
  if not (select private.is_account()) then
    raise exception 'not_an_account' using errcode = '42501';
  end if;
  if (select private.is_editor()) then
    raise exception 'is_editor: an editor is removed by the owner' using errcode = '42501';
  end if;
  if exists (select 1 from public.route where owner_id = who)
     or exists (select 1 from public.route_variant where owner_id = who)
     or exists (select 1 from public.stop where owner_id = who) then
    raise exception 'owns_map_rows: this account still owns rows of the map; the owner moves them first'
      using errcode = 'P0001';
  end if;
  -- Kept: unlinked before the contributor row goes, so the cascade finds none of theirs.
  if delete_uploads is false then
    update public.contribution
      set contributor_id = null, unlinked = true, start_name = null, end_name = null, description = null
      where contributor_id = who;
  end if;
  delete from public.gps_session where owner_id = who;
  -- GoTrue's log of their sign-ins and changes, which names them by email.
  if to_regclass('auth.audit_log_entries') is not null then
    delete from auth.audit_log_entries
      where payload ->> 'actor_id' = who::text or payload -> 'traits' ->> 'user_id' = who::text;
  end if;
  delete from auth.users where id = who;
end $$;
revoke all on function public.delete_my_account(boolean) from public, anon;
grant execute on function public.delete_my_account(boolean) to authenticated;
-- <<< supabase/migrations/20261105090000_delete_account_refuse_uploads.sql

-- 2. After: one delete_my_account, a definer with a pinned path for authenticated only, defaulting
--    to true, refusing anything but false before it locks or changes anything.
do $$
begin
  if (select count(*) from pg_proc where proname = 'delete_my_account'
      and pronamespace = 'public'::regnamespace) <> 1 then
    raise exception 'delete_account_refuse_uploads: not exactly one delete_my_account. Nothing was changed.';
  end if;
  if exists (
    select 1 from pg_proc
    where oid = 'public.delete_my_account(boolean)'::regprocedure
      and (not prosecdef or not coalesce(proconfig @> array['search_path=""'], false)
           or not has_function_privilege('authenticated', oid, 'execute')
           or has_function_privilege('anon', oid, 'execute')
           or has_function_privilege('public', oid, 'execute')
           or pronargdefaults <> 1 or pg_get_expr(proargdefaults, 0) <> 'true')
  ) then
    raise exception 'delete_account_refuse_uploads: not a definer with a pinned path for authenticated only, defaulting to true. Nothing was changed.';
  end if;
  if (select position('if delete_uploads is distinct from false then' in prosrc) = 0
        or position('if delete_uploads is distinct from false then' in prosrc) > position('for update' in prosrc)
      from pg_proc where oid = 'public.delete_my_account(boolean)'::regprocedure) then
    raise exception 'delete_account_refuse_uploads: the refusal is not the first check. Nothing was changed.';
  end if;
end $$;

-- 3. The ledger row, once.
insert into supabase_migrations.schema_migrations (version, name, statements)
select greatest(to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
                (select (max(version)::bigint + 1)::text from supabase_migrations.schema_migrations
                 where version ~ '^[0-9]{14}$')),
       'delete_account_refuse_uploads', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'delete_account_refuse_uploads');

commit;
