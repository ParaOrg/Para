-- ParaPo — undo the delete_account_refuse_uploads migration: puts back
-- delete_my_account(delete_uploads boolean default true) as 20261101090000_delete_account_keep_uploads
-- left it (true, null or no argument deletes the account and every upload again), and removes the
-- ledger row. Safe to run twice. Run it before 20261101090000's revert, never after: that one drops
-- the function this puts back.
begin;
do $$
begin
  if to_regprocedure('public.delete_my_account(boolean)') is null then
    raise exception 'delete_account_refuse_uploads revert: delete_my_account(boolean) is not here (20261101090000 is reverted or not applied). Nothing was changed.';
  end if;
end $$;
create or replace function public.delete_my_account(delete_uploads boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare
  who uuid := (select auth.uid());
begin
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
delete from supabase_migrations.schema_migrations where name = 'delete_account_refuse_uploads';
commit;
