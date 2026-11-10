-- ParaPo — drop what nothing uses: the gps_session table, route.short_name
-- and route.fare_as_of, and an index the unique one already covers.
--
-- Clean-up step 5 of .scratch/codebase-review/database.md (M4, L4), the
-- parts nothing reads or writes:
-- - gps_session (0001): editors' recorded trips, from before the contributor
--   app. No app has written it since; the contributor app records into
--   contribution. delete_my_account still deleted the caller's rows from it,
--   so it is redefined here without that one statement, otherwise as
--   20261105090000_delete_account_refuse_uploads left it.
-- - route.short_name and route.fare_as_of (0001): never written. The studio
--   reads them as optional (direction-schema.ts), so a build that still asks
--   for them reads none; the publish never selects them.
-- - route_variant_route_id_idx (0001): route_variant_one_per_direction
--   (route_id, reversed) begins with the same column and serves the same
--   lookups and the foreign key.
--
-- Nothing is lost: the apply refuses while gps_session has a row or either
-- column holds a value, so a recording or a fact is never dropped unseen.
--
-- Not in this step (each read by the studio or the publish today, so each
-- needs an app change first): route.route_code and long_name,
-- route_variant.direction_name, origin_terminal and destination_terminal;
-- nor the merged read rules or the grant and definer tidy-ups (L1, L2, L5).
--
-- Safe to apply now: no studio build and no publish reads what goes. The
-- weekly backup names gps_session by pattern and, without --strict-names,
-- skips a name that matches nothing.
--
-- Order: after 20261105180000_keep_uploads_on_user_delete (its apply refuses
-- without it). Not applied by the session that wrote it: the owner applies it,
-- as postgres, from supabase/apply/20261105200000_drop_dead_weight_apply.sql,
-- then records the ledger version. Safe to run twice. Undo:
-- supabase/apply/20261105200000_drop_dead_weight_revert.sql (the table and the
-- columns come back empty: there was nothing in them).

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
  -- GoTrue's log of their sign-ins and changes, which names them by email.
  if to_regclass('auth.audit_log_entries') is not null then
    delete from auth.audit_log_entries
      where payload ->> 'actor_id' = who::text or payload -> 'traits' ->> 'user_id' = who::text;
  end if;
  delete from auth.users where id = who;
end $$;
revoke all on function public.delete_my_account(boolean) from public, anon;
grant execute on function public.delete_my_account(boolean) to authenticated;

drop table if exists public.gps_session;
alter table public.route drop column if exists short_name, drop column if exists fare_as_of;
drop index if exists public.route_variant_route_id_idx;
