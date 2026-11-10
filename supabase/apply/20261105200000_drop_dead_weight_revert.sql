-- ParaPo — undo drop_dead_weight: gps_session, route.short_name and route.fare_as_of come back empty
-- (they were empty when dropped), route_variant_route_id_idx comes back, and delete_my_account
-- deletes the caller's gps_session rows again, as 20261105090000_delete_account_refuse_uploads has it.
-- The two columns come back at the end of route's column list, not where they stood. Touches no data.
-- One transaction; safe to run twice.
begin;

create table if not exists public.gps_session (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    route_variant_id uuid,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    points jsonb DEFAULT '[]'::jsonb NOT NULL,
    note text,
    constraint gps_session_pkey primary key (id),
    constraint gps_session_owner_id_fkey foreign key (owner_id) references auth.users (id),
    constraint gps_session_route_variant_id_fkey foreign key (route_variant_id)
      references public.route_variant (id) on delete set null
);
create index if not exists gps_session_owner_id_idx on public.gps_session (owner_id);
create index if not exists gps_session_route_variant_id_idx on public.gps_session (route_variant_id);
alter table public.gps_session enable row level security;
drop policy if exists gps_session_delete on public.gps_session;
create policy gps_session_delete on public.gps_session for delete to authenticated
  using ((((select auth.uid() as uid) = owner_id) and (select private.is_editor() as is_editor)));
drop policy if exists gps_session_insert on public.gps_session;
create policy gps_session_insert on public.gps_session for insert to authenticated
  with check ((((select auth.uid() as uid) = owner_id) and (select private.is_editor() as is_editor)));
drop policy if exists gps_session_select on public.gps_session;
create policy gps_session_select on public.gps_session for select to authenticated
  using (((select auth.uid() as uid) = owner_id));
drop policy if exists gps_session_update on public.gps_session;
create policy gps_session_update on public.gps_session for update to authenticated
  using ((((select auth.uid() as uid) = owner_id) and (select private.is_editor() as is_editor)))
  with check ((((select auth.uid() as uid) = owner_id) and (select private.is_editor() as is_editor)));
grant select, insert, update, delete on public.gps_session to authenticated;

alter table public.route add column if not exists short_name text, add column if not exists fare_as_of date;
create index if not exists route_variant_route_id_idx on public.route_variant (route_id);

-- As 20261105090000_delete_account_refuse_uploads.
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

delete from supabase_migrations.schema_migrations where name = 'drop_dead_weight';
commit;
