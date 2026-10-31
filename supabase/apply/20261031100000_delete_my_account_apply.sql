-- ParaPo — apply 20261031100000_delete_my_account.sql to the live project, in one run.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it once.
-- It is one transaction: it checks the project first, applies
-- supabase/migrations/20261031100000_delete_my_account.sql (copied below unchanged), checks the
-- result, and writes the ledger row. If any check fails it raises, and nothing
-- at all is changed, ledger included. A second run stops at step 1 and changes
-- nothing.
-- Afterwards: supabase/apply/20261031100000_delete_my_account_check.sql (it adds test users
-- and rolls them back), then regenerate the types. Undo: 20261031100000_delete_my_account_revert.sql.
--
-- Order: after 20261031090000_account_stats (step 1 refuses without it), and
-- before the app's Delete account ships.
--
-- Adds one function and changes the hide-stamp trigger's function; no table,
-- no policy and no row changes.

begin;

-- 1. Before: account_stats is in the ledger, this has not run, and postgres may delete auth users.
do $$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'delete_my_account') then
    raise exception 'delete_my_account: already applied. Nothing was changed.';
  end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where name = 'account_stats')
     or to_regclass('private.contributor_retired_totals') is null then
    raise exception 'delete_my_account: 20261031090000_account_stats is not applied here. Nothing was changed.';
  end if;
  if to_regprocedure('private.is_account()') is null or to_regprocedure('private.is_editor()') is null then
    raise exception 'delete_my_account: private.is_account() or private.is_editor() is missing. Nothing was changed.';
  end if;
  -- The function runs as its owner, the role applying this.
  if not has_table_privilege(current_user, 'auth.users', 'delete') then
    raise exception 'delete_my_account: % cannot delete from auth.users. Nothing was changed.', current_user;
  end if;
end $$;

-- >>> supabase/migrations/20261031100000_delete_my_account.sql, unchanged
-- ParaPo — a contributor deletes their own account: public.delete_my_account()
--
-- Account settings → Delete account. The signed-in contributor's auth user is
-- deleted, and everything of theirs goes with it through the foreign keys
-- already there:
--   contributor (and its name, number and blocked state)  on delete cascade from auth.users
--   contribution                                          on delete cascade from contributor
--   point_batch, hinto, contribution_use                  on delete cascade from contribution
--   private.contributor_retired_totals                    on delete cascade from contributor
--   private.claim_token                                   their own tokens cascade; one they
--                                                         used keeps claimed_by null
--   GoTrue's sessions, identities and refresh tokens      cascade inside auth
-- Retired contributions (older than 24 months) were already unlinked from them
-- and stay, as anyone's.
--
-- A user already gone (the delete went through and its answer was lost) is
-- answered as deleted, with nothing to do: the phone's retry then clears it.
--
-- Refused (SQLSTATE 42501):
--   not_signed_in    no caller.
--   not_an_account   an anonymous phone. Its uploads are deleted one by one, or
--                    claimed by an account; deleting the identity mid-claim
--                    would strand the claim.
--   is_editor        an editor. Editors are removed by the owner, who decides
--                    what happens to their work first.
-- And (P0001) owns_map_rows: the account still owns rows of the map (route,
-- route_variant, stop: owner_id has no on delete, on purpose), as a former
-- editor's can. The map is not deleted with a person; the owner moves those
-- rows first. Nothing is deleted then. Its own gps_session rows (the first
-- recorder's) are its location data, not the map: they go with it.
--
-- private.contribution_hide_stamp, the trigger that keeps who hid an upload,
-- is changed here: it lets hidden_by go to null once that user no longer
-- exists. A former editor who hid uploads is deleted with hidden_by set null
-- on them (its on delete set null); before, the trigger wrote the deleted id
-- back and the delete failed. Anyone else still cannot change who hid one.
--
-- Returns nothing. The phone signs itself out afterwards: its session's user
-- is gone, so its token is refused from then on.
--
-- Who may call it: authenticated only (definer, pinned path). anon nothing.
--
-- Order: after 20261031090000_account_stats (step 1 of the apply refuses
-- without it), so the retired totals go too. The app's Delete account must not
-- ship before this is applied: until then the call answers that the function
-- does not exist, and nothing is deleted.
--
-- Written, not applied: the owner applies it from
-- supabase/apply/20261031100000_delete_my_account_apply.sql.

create function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  who uuid := (select auth.uid());
begin
  if who is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  -- Gone already: an earlier call deleted it and its answer was lost.
  if not exists (select 1 from auth.users where id = who) then
    return;
  end if;
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
  delete from public.gps_session where owner_id = who;
  delete from auth.users where id = who;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- As 20261019125900_contributions.sql's, but hidden_by may go to null once its
-- user is gone (on delete set null): the user being deleted is gone by then.
create or replace function private.contribution_hide_stamp()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.hidden_at is null then
    new.hidden_by := null;
    new.hidden_note := null;
  elsif old.hidden_at is null then
    new.hidden_at := now();
    new.hidden_by := (select auth.uid());
  else
    new.hidden_at := old.hidden_at;
    if new.hidden_by is not null
       or exists (select 1 from auth.users where id = old.hidden_by) then
      new.hidden_by := old.hidden_by;
    end if;
  end if;
  return new;
end $$;
revoke all on function private.contribution_hide_stamp() from public, anon, authenticated;
-- <<< supabase/migrations/20261031100000_delete_my_account.sql

-- 2. After: a definer with a pinned path, for authenticated only.
do $$
begin
  if exists (
    select 1 from pg_proc
    where oid = 'public.delete_my_account()'::regprocedure
      and (not prosecdef or not coalesce(proconfig @> array['search_path=""'], false)
           or not has_function_privilege('authenticated', oid, 'execute')
           or has_function_privilege('anon', oid, 'execute')
           or has_function_privilege('public', oid, 'execute'))
  ) then
    raise exception 'delete_my_account: not a definer with a pinned path for authenticated only. Nothing was changed.';
  end if;
end $$;

-- 3. The ledger row, once.
insert into supabase_migrations.schema_migrations (version, name, statements)
select greatest(to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
                (select (max(version)::bigint + 1)::text from supabase_migrations.schema_migrations
                 where version ~ '^[0-9]{14}$')),
       'delete_my_account', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'delete_my_account');

commit;
