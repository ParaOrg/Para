-- ParaPo — apply 20261101090000_delete_account_keep_uploads.sql to the live project, in one run.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it once.
-- It is one transaction: it checks the project first, applies
-- supabase/migrations/20261101090000_delete_account_keep_uploads.sql (copied below unchanged),
-- checks the result, and writes the ledger row. If any check fails it raises, and nothing at
-- all is changed, ledger included. A second run stops at step 1 and changes nothing.
-- Afterwards: supabase/apply/20261101090000_delete_account_keep_uploads_check.sql (it adds test
-- users and rolls them back), then regenerate the types. Undo:
-- 20261101090000_delete_account_keep_uploads_revert.sql.
--
-- Order: after 20261031100000_delete_my_account (step 1 refuses without it).
--
-- Adds one column (contribution.unlinked, false on every row), replaces
-- delete_my_account() with delete_my_account(delete_uploads boolean default true), and
-- teaches private.retire_month to retire a ride kept from a deleted account. No row changes.

begin;

-- 1. Before: delete_my_account is in the ledger, this has not run, and postgres may delete auth users.
do $$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'delete_account_keep_uploads') then
    raise exception 'delete_account_keep_uploads: already applied. Nothing was changed.';
  end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where name = 'delete_my_account')
     or to_regprocedure('public.delete_my_account()') is null then
    raise exception 'delete_account_keep_uploads: 20261031100000_delete_my_account is not applied here. Nothing was changed.';
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'contribution' and column_name = 'unlinked') then
    raise exception 'delete_account_keep_uploads: contribution.unlinked already exists. Nothing was changed.';
  end if;
  if to_regprocedure('private.retire_month(date, integer)') is null
     or to_regprocedure('private.carry_retired_month(date)') is null then
    raise exception 'delete_account_keep_uploads: private.retire_month or carry_retired_month is missing. Nothing was changed.';
  end if;
  -- The function runs as its owner, the role applying this: it locks and deletes the user, and
  -- deletes GoTrue's audit log entries about them.
  if not has_table_privilege(current_user, 'auth.users', 'delete')
     or not has_table_privilege(current_user, 'auth.users', 'update') then
    raise exception 'delete_account_keep_uploads: % cannot lock and delete auth.users rows. Nothing was changed.', current_user;
  end if;
  if to_regclass('auth.audit_log_entries') is not null
     and not has_table_privilege(current_user, 'auth.audit_log_entries', 'delete') then
    raise exception 'delete_account_keep_uploads: % cannot delete from auth.audit_log_entries. Nothing was changed.', current_user;
  end if;
end $$;

-- >>> supabase/migrations/20261101090000_delete_account_keep_uploads.sql, unchanged
-- ParaPo — Delete account keeps the uploads by default:
-- public.delete_my_account(delete_uploads boolean default true)
--
-- The owner's rule (2026-11-01): deleting an account removes the person (their
-- name, email, number and password); the routes they uploaded stay, unlinked
-- from them, unless they tick "Also delete my uploaded routes".
--
-- delete_my_account() becomes delete_my_account(delete_uploads boolean default true):
--   delete_uploads = true    exactly as 20261031100000_delete_my_account: the auth
--                            user goes, and the contributor row, contributions,
--                            point batches, hintos, uses, retired totals and claim
--                            tokens with it through the cascades.
--   delete_uploads = false   first unlinks every contribution of theirs:
--                            contributor_id null, as retirement leaves an old one
--                            ("anyone's"), unlinked marked true, and the words they
--                            typed (start_name, end_name, description) cleared.
--                            Then the same delete. The contribution, point_batch,
--                            hinto and contribution_use rows stay; nothing on them
--                            names the person any more:
--                              contribution.contributor_id   null (above)
--                              contribution.hidden_by        the editor who hid it,
--                                                            never the contributor
--                                                            (an editor cannot
--                                                            call this)
--                              contribution_use.editor_id    the editor who used it
--                              point_batch, hinto            no person column
--                            The person's own rows go as before: the contributor
--                            row (name, number, blocked state), the retired totals
--                            and their stats, their claim tokens (one they used on
--                            another phone keeps claimed_by null), gps_session,
--                            and GoTrue's user, sessions and identities.
--                            Once kept, a ride is no one's: its person can no
--                            longer remove it themselves; an editor can, on request.
-- Either way, GoTrue's audit log entries about the user (auth.audit_log_entries,
-- whose payload holds their email) are deleted with them: deleting auth.users
-- directly does not touch that log.
--
-- The default is true so the contributor app already on phones, which calls it
-- with no argument and tells people their uploads are deleted, keeps doing
-- exactly what it says. The new app passes the box's answer.
--
-- The person's rows are locked first (their auth user and contributor row, for
-- update), so a claim or an upload committing meanwhile waits, and either lands
-- before the unlink sees it or fails on the deleted contributor: never deleted
-- when the person asked to keep their uploads.
--
-- contribution.unlinked (new, false on every row, true only with no contributor):
-- a ride kept from a deleted account. A yes or no, not a time: a shared stamp would group one person's
-- rides together again. retire_month treats a null contributor_id as "already
-- retired" to skip a done month, so without a mark of its own a kept ride would
-- never be retired: its ends never cut at 24 months, as ADR 0004 promises.
-- private.retire_month now also takes a ride marked unlinked, and clears the
-- mark as it retires the ride, so a second run still skips a done month. Its
-- retired totals have nobody to go to: carry_retired_month reads only rides
-- that still have a contributor, as before.
--
-- Same refusals as before (42501 not_signed_in, not_an_account, is_editor; P0001
-- owns_map_rows), checked before anything changes; a user already gone is
-- answered as deleted. Definer, pinned path, authenticated only.
--
-- The zero-argument function is dropped and replaced, not overloaded: two
-- functions would make a call with no argument ambiguous. PostgREST's
-- rpc('delete_my_account') with no body, as the app on phones sends it, reaches
-- the new one with its default.
--
-- Order: after 20261031100000_delete_my_account (step 1 of the apply refuses
-- without it). Written, not applied: the owner applies it from
-- supabase/apply/20261101090000_delete_account_keep_uploads_apply.sql, then
-- regenerates src/shared/types/database.types.ts.

alter table public.contribution
  add column unlinked boolean not null default false,
  -- Only on a ride no one owns: a phone cannot insert a ride of its own marked kept.
  add constraint contribution_unlinked_unowned check (not unlinked or contributor_id is null);

drop function public.delete_my_account();

create function public.delete_my_account(delete_uploads boolean default true)
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

-- As 20261031090000_account_stats.sql's, but a ride kept from a deleted account
-- (unlinked) is retired too, and the mark is cleared as it is.
create or replace function private.retire_month(target_month date, min_age_months integer default 24)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  first_day date := date_trunc('month', target_month)::date;
  next_day date := (date_trunc('month', target_month) + interval '1 month')::date;
  piece text := 'point_batch_' || to_char(date_trunc('month', target_month), 'YYYY_MM');
  r record;
  ends jsonb;
  trimmed jsonb;
  contributions integer := 0;
  hintos_deleted integer := 0;
  removed integer;
  months_ahead integer;
begin
  if target_month <> first_day then
    raise exception 'bad_month: pass the first day of a month' using errcode = 'P0001';
  end if;
  if first_day > (date_trunc('month', now() at time zone 'UTC') - make_interval(months => min_age_months))::date then
    raise exception 'too_soon: % is newer than % months', first_day, min_age_months using errcode = 'P0001';
  end if;

  -- Locked before the carry reads them, so a ride deleted meanwhile is neither carried nor kept.
  perform 1 from public.contribution
    where (received_at at time zone 'UTC') >= first_day
      and (received_at at time zone 'UTC') < next_day
      and (contributor_id is not null or unlinked)
    for update;
  -- The contributors' lifetime numbers keep what this month's rows are about to lose.
  perform private.carry_retired_month(first_day);

  for r in
    select id, line from public.contribution
    where (received_at at time zone 'UTC') >= first_day
      and (received_at at time zone 'UTC') < next_day
      -- Retirement leaves both null, so a second run skips a done month.
      and (contributor_id is not null or unlinked)
    for update
  loop
    if r.line is not null and jsonb_typeof(r.line -> 'coordinates') = 'array' then
      ends := jsonb_build_array(r.line -> 'coordinates' -> 0, r.line -> 'coordinates' -> -1);
      delete from public.hinto h
        where h.contribution_id = r.id
          and exists (
            select 1 from jsonb_array_elements(ends) e
            where private.distance_m(h.lat, h.lng,
              (e ->> 1)::double precision, (e ->> 0)::double precision) <= 200
          );
      get diagnostics removed = row_count;
      hintos_deleted := hintos_deleted + removed;
    end if;
    trimmed := private.trim_line_ends(r.line, 200);
    update public.contribution set
      line = trimmed,
      west = (select min((c -> 0)::text::double precision) from jsonb_array_elements(trimmed -> 'coordinates') c),
      east = (select max((c -> 0)::text::double precision) from jsonb_array_elements(trimmed -> 'coordinates') c),
      south = (select min((c -> 1)::text::double precision) from jsonb_array_elements(trimmed -> 'coordinates') c),
      north = (select max((c -> 1)::text::double precision) from jsonb_array_elements(trimmed -> 'coordinates') c),
      start_name = null, end_name = null, description = null,
      contributor_id = null, unlinked = false
      where id = r.id;
    contributions := contributions + 1;
  end loop;

  if to_regclass(format('public.%I', piece)) is not null then
    execute format('drop table public.%I', piece);
  end if;
  -- Anything that landed in the default piece for this month.
  delete from public.point_batch_default where point_batch_default.month = first_day;

  months_ahead := coalesce((
    extract(year from private.last_piece_month()) * 12 + extract(month from private.last_piece_month())
    - extract(year from now() at time zone 'UTC') * 12 - extract(month from now() at time zone 'UTC')
  )::integer, 0);
  if months_ahead < 6 then
    raise warning 'fewer than six monthly pieces ahead: run private.add_months(12)';
  end if;

  return jsonb_build_object(
    'month', first_day,
    'contributions', contributions,
    'hintos_deleted', hintos_deleted
  );
end $$;
revoke all on function private.retire_month(date, integer) from public, anon, authenticated;
-- <<< supabase/migrations/20261101090000_delete_account_keep_uploads.sql

-- 2. After: one delete_my_account, a definer with a pinned path for authenticated only; the column,
--    which no API role may write; retire_month taking kept rides.
do $$
begin
  if to_regprocedure('public.delete_my_account()') is not null then
    raise exception 'delete_account_keep_uploads: the zero-argument delete_my_account is still there. Nothing was changed.';
  end if;
  if exists (
    select 1 from pg_proc
    where oid = 'public.delete_my_account(boolean)'::regprocedure
      and (not prosecdef or not coalesce(proconfig @> array['search_path=""'], false)
           or not has_function_privilege('authenticated', oid, 'execute')
           or has_function_privilege('anon', oid, 'execute')
           or has_function_privilege('public', oid, 'execute')
           or pronargdefaults <> 1)
  ) then
    raise exception 'delete_account_keep_uploads: not a definer with a pinned path for authenticated only, with its default. Nothing was changed.';
  end if;
  if exists (select 1 from public.contribution where unlinked) then
    raise exception 'delete_account_keep_uploads: a ride is already marked unlinked. Nothing was changed.';
  end if;
  if has_column_privilege('authenticated', 'public.contribution', 'unlinked', 'update')
     or has_column_privilege('anon', 'public.contribution', 'unlinked', 'update') then
    raise exception 'delete_account_keep_uploads: an API role may write contribution.unlinked. Nothing was changed.';
  end if;
  if (select position('or unlinked)' in prosrc) = 0 from pg_proc
      where oid = 'private.retire_month(date, integer)'::regprocedure) then
    raise exception 'delete_account_keep_uploads: retire_month does not take kept rides. Nothing was changed.';
  end if;
end $$;

-- 3. The ledger row, once.
insert into supabase_migrations.schema_migrations (version, name, statements)
select greatest(to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
                (select (max(version)::bigint + 1)::text from supabase_migrations.schema_migrations
                 where version ~ '^[0-9]{14}$')),
       'delete_account_keep_uploads', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'delete_account_keep_uploads');

commit;
