-- ParaPo — apply 20261105180000_keep_uploads_on_user_delete.sql to the live project, in one run.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it once. One transaction: it
-- checks the project first, applies supabase/migrations/20261105180000_keep_uploads_on_user_delete.sql
-- (copied below unchanged), checks the result, and writes the ledger row. If any check fails it
-- raises, and nothing at all is changed, ledger included. A second run stops at step 1 and changes
-- nothing. Afterwards: 20261105180000_keep_uploads_on_user_delete_check.sql (it adds test users and
-- rides, deletes them, and rolls everything back). Undo:
-- 20261105180000_keep_uploads_on_user_delete_revert.sql.
--
-- Adds one function and one trigger; no table, grant or row changes. Safe for every app now
-- running: it changes only what happens when a user or a contributor row is deleted.

begin;

-- 1. Before: delete_account_keep_uploads is in the ledger and this has not run.
do $$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'keep_uploads_on_user_delete') then
    raise exception 'keep_uploads_on_user_delete: already applied. Nothing was changed.';
  end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where name = 'delete_account_keep_uploads') then
    raise exception 'keep_uploads_on_user_delete: 20261101090000_delete_account_keep_uploads is not applied here. Nothing was changed.';
  end if;
end $$;

-- >>> supabase/migrations/20261105180000_keep_uploads_on_user_delete.sql, unchanged
-- ParaPo — deleting a user anywhere keeps their uploads: a contributor's rides
-- are unlinked before the contributor row goes, never cascaded away.
--
-- Clean-up step 1 of .scratch/codebase-review/database.md (H2), approved by
-- the owner on 2026-11-05. contributor.id is on delete cascade from auth.users
-- (20261019125900_contributions), and contribution.contributor_id on delete
-- cascade from contributor, so deleting a user from the Supabase dashboard,
-- an anonymous-user clean-up or an admin script erased all of that person's
-- contributions, points, hintos and uses. Only delete_my_account unlinked
-- them first. That broke the rule that uploads survive the account
-- (20261105090000_delete_account_refuse_uploads).
--
-- Now a before-delete trigger on public.contributor unlinks the person's
-- rides first, as delete_my_account(delete_uploads => false) does:
-- contributor_id null, unlinked true, the words they typed (start_name,
-- end_name, description) cleared. The cascade from contributor then finds no
-- ride of theirs, so the rides keep their points, hintos and uses. Whatever
-- deletes the contributor row, a user's deletion or a direct delete, goes
-- through it.
--
-- Unchanged: delete_my_account unlinks before it deletes, so the trigger finds
-- nothing of theirs left; finish_claim moves an anonymous phone's rides to
-- the account before it deletes the phone's contributor row, so there too.
-- The person's own rows still go with them: the contributor row (name,
-- number, blocked state), the retired totals and the claim tokens.
--
-- Order: after 20261101090000_delete_account_keep_uploads, which added
-- contribution.unlinked (its apply refuses without it). Not applied by the
-- session that wrote it: the owner applies it, as postgres, from
-- supabase/apply/20261105180000_keep_uploads_on_user_delete_apply.sql, then
-- records the ledger version. Safe to run twice. Undo:
-- supabase/apply/20261105180000_keep_uploads_on_user_delete_revert.sql.

-- Security definer: a dashboard delete runs as supabase_auth_admin, an
-- anonymous clean-up as whoever runs it, and the rides must be unlinked
-- whatever that role may read or write.
create or replace function private.unlink_contributions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.contribution
    set contributor_id = null, unlinked = true, start_name = null, end_name = null, description = null
    where contributor_id = old.id;
  return old;
end;
$$;
revoke all on function private.unlink_contributions() from public, anon, authenticated;

create or replace trigger contributor_unlink_contributions
  before delete on public.contributor
  for each row execute function private.unlink_contributions();
-- <<< supabase/migrations/20261105180000_keep_uploads_on_user_delete.sql

-- 2. After: the trigger is there, enabled, before delete on contributor, and its function granted to nobody.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'contributor_unlink_contributions' and tgrelid = 'public.contributor'::regclass
      and tgenabled = 'O' and tgtype & 2 = 2 and tgtype & 8 = 8
  ) then
    raise exception 'keep_uploads_on_user_delete: the trigger is missing or not before delete. Nothing was changed.';
  end if;
  if has_function_privilege('authenticated', 'private.unlink_contributions()', 'execute')
     or has_function_privilege('anon', 'private.unlink_contributions()', 'execute') then
    raise exception 'keep_uploads_on_user_delete: its function is callable by an app role. Nothing was changed.';
  end if;
end $$;

-- 3. The ledger row, once.
insert into supabase_migrations.schema_migrations (version, name, statements)
select greatest(to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
                (select (max(version)::bigint + 1)::text from supabase_migrations.schema_migrations
                 where version ~ '^[0-9]{14}$')),
       'keep_uploads_on_user_delete', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'keep_uploads_on_user_delete');

commit;
