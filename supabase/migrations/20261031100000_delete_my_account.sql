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
-- Refused (SQLSTATE 42501):
--   not_signed_in    no caller.
--   not_an_account   an anonymous phone. Its uploads are deleted one by one, or
--                    claimed by an account; deleting the identity mid-claim
--                    would strand the claim.
--   is_editor        an editor. Editors are removed by the owner, who decides
--                    what happens to their work first.
-- And (P0001) owns_map_rows: the account still owns rows of the map (routes,
-- directions, hotspots, links: owner_id has no on delete, on purpose), as a
-- former editor's can. The map is not deleted with a person; the owner moves
-- those rows first. Nothing is deleted then.
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
  if not (select private.is_account()) then
    raise exception 'not_an_account' using errcode = '42501';
  end if;
  if (select private.is_editor()) then
    raise exception 'is_editor: an editor is removed by the owner' using errcode = '42501';
  end if;
  delete from auth.users where id = who;
exception
  when foreign_key_violation then
    raise exception 'owns_map_rows: this account still owns rows of the map; the owner moves them first'
      using errcode = 'P0001';
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
