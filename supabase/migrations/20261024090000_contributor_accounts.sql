-- ParaPo — contributor_accounts, a profile on the contributor and the claim of an anonymous phone's uploads
--
-- Ticket contributor-accounts/01, .scratch/contributor-accounts/spec.md "One
-- identity, upgraded" and "Who sees what". A phone's anonymous user is upgraded
-- to an account with the same id, so its uploads are the account's at once. A
-- phone that signs in to an account made elsewhere hands its anonymous
-- uploads over with begin_claim / finish_claim.
--
--   contributor.name, .phone, .profile_updated_at
--                  null for an anonymous contributor and for every row made before.
--   public.set_profile(name, phone)
--                  an account writes its own name and number.
--   public.get_profile()
--                  an account reads its own name and number back (see below).
--   public.begin_claim() / public.finish_claim(token)
--                  the hand-over, below.
--   private.claim_token
--                  the one-time tokens begin_claim makes.
--
-- Who reads name and phone: column privileges, not a view. authenticated keeps
-- its select on contributor but no longer on phone, so the studio's existing
-- reads (an editor reads every row) show name and never the number, and an
-- account reads its own number only through get_profile(). A view would need
-- its own row rules and a second place to forget them; a column grant fails
-- closed. Insert is cut down to the id too, so a phone cannot write a name or
-- number around set_profile's checks; the stamp trigger still clears the block
-- columns. The email stays in auth.users and is never copied here.
--
-- Anonymous or not is read from auth.users, not from the token's claim: right
-- after auth.updateUser upgrades the phone, its token still says anonymous
-- until it is refreshed, and set_profile is the next call.
--
-- The claim:
--   begin_claim   an anonymous user gets a one-time token, good for 10 minutes.
--                 Its earlier unused tokens are dropped.
--   finish_claim  an account presents the token: every contribution of the
--                 anonymous contributor moves to the account's contributor row
--                 (made if missing; their points and hintos hang off the
--                 contribution, so nothing else moves), a block carries over,
--                 and the anonymous contributor row is deleted. Answers how many
--                 contributions moved. The same token again, by the same account,
--                 answers 0 and changes nothing. A token whose anonymous user
--                 has become an account since is refused: it would take that
--                 account's uploads. The anonymous auth user itself is left in
--                 auth.users (Supabase does not remove anonymous users by
--                 itself; the owner can delete old ones from the dashboard).
--
-- Errors (SQLSTATE 42501 unless noted): not_signed_in; not_an_account (the
-- caller is anonymous); not_anonymous (begin_claim from an account);
-- bad_name, bad_phone (22023); bad_token, token_expired (P0001).
--
-- Nothing else changes: save_contribution, the policies on contribution, the
-- sign-up hook.
--
-- Written, not applied: the owner applies it.

-- ----------------------------------------------------------------- profile

alter table public.contributor
  add column name text check (char_length(name) between 1 and 80),
  add column phone text check (phone ~ '^\+639[0-9]{9}$'),
  add column profile_updated_at timestamptz;

revoke select, insert on public.contributor from authenticated;
grant select (id, first_seen_at, blocked_at, blocked_by, block_note, name, profile_updated_at)
  on public.contributor to authenticated;
grant insert (id) on public.contributor to authenticated;

-- Whether the signed-in user is a permanent account. A definer, because an API
-- role cannot read auth.users.
create function private.is_account()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users where id = (select auth.uid()) and not is_anonymous
  );
$$;
revoke all on function private.is_account() from public, anon;
grant execute on function private.is_account() to authenticated;

create function public.set_profile(name text, phone text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  who uuid := (select auth.uid());
  clean text := btrim(set_profile.name);
begin
  if who is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if not (select private.is_account()) then
    raise exception 'not_an_account' using errcode = '42501';
  end if;
  if clean is null or char_length(clean) not between 1 and 80 then
    raise exception 'bad_name: 1 to 80 characters' using errcode = '22023';
  end if;
  if set_profile.phone is null or set_profile.phone !~ '^\+639[0-9]{9}$' then
    raise exception 'bad_phone: +639 and nine digits' using errcode = '22023';
  end if;
  -- Two statements: the stamp trigger on insert clears the block columns only.
  insert into public.contributor (id) values (who) on conflict (id) do nothing;
  update public.contributor
    set name = clean, phone = set_profile.phone, profile_updated_at = now()
    where id = who;
end $$;

create function public.get_profile()
returns table (name text, phone text, profile_updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.name, c.phone, c.profile_updated_at
  from public.contributor c
  where c.id = (select auth.uid());
$$;

revoke all on function public.set_profile(text, text) from public, anon;
revoke all on function public.get_profile() from public, anon;
grant execute on function public.set_profile(text, text) to authenticated;
grant execute on function public.get_profile() to authenticated;

-- ------------------------------------------------------------------- claim

create table private.claim_token (
  token uuid primary key default gen_random_uuid(),
  anonymous_id uuid not null references auth.users (id) on delete cascade,
  made_at timestamptz not null default now(),
  used_at timestamptz,
  claimed_by uuid references auth.users (id) on delete set null
);
create index claim_token_anonymous on private.claim_token (anonymous_id);
create index claim_token_claimed_by on private.claim_token (claimed_by) where claimed_by is not null;
alter table private.claim_token enable row level security;
revoke all on table private.claim_token from public, anon, authenticated;

create function public.begin_claim()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  who uuid := (select auth.uid());
  made uuid;
begin
  if who is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if (select private.is_account()) then
    raise exception 'not_anonymous' using errcode = '42501';
  end if;
  -- Spent and stale tokens are cleared here; no schedule is needed.
  delete from private.claim_token
    where (anonymous_id = who and used_at is null) or made_at < now() - interval '1 day';
  insert into private.claim_token (anonymous_id) values (who) returning token into made;
  return made;
end $$;

create function public.finish_claim(token uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  who uuid := (select auth.uid());
  t private.claim_token;
  moved integer;
begin
  if who is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if not (select private.is_account()) then
    raise exception 'not_an_account' using errcode = '42501';
  end if;

  select * into t from private.claim_token c where c.token = finish_claim.token for update;
  if not found then
    raise exception 'bad_token' using errcode = 'P0001';
  end if;
  if t.used_at is not null then
    if t.claimed_by = who then
      return 0;
    end if;
    raise exception 'bad_token' using errcode = 'P0001';
  end if;
  if t.made_at < now() - interval '10 minutes' then
    raise exception 'token_expired' using errcode = 'P0001';
  end if;
  -- Still the anonymous identity it was made for: an upgraded one is an account.
  if t.anonymous_id = who or not exists (
    select 1 from auth.users where id = t.anonymous_id and is_anonymous
  ) then
    raise exception 'bad_token' using errcode = 'P0001';
  end if;

  insert into public.contributor (id) values (who) on conflict (id) do nothing;
  -- Held so a save racing the claim cannot slip a contribution in under the
  -- row that is about to go.
  perform 1 from public.contributor where id = t.anonymous_id for update;

  update public.contributor mine
    set blocked_at = theirs.blocked_at, blocked_by = theirs.blocked_by, block_note = theirs.block_note
    from public.contributor theirs
    where mine.id = who and mine.blocked_at is null
      and theirs.id = t.anonymous_id and theirs.blocked_at is not null;

  update public.contribution set contributor_id = who where contributor_id = t.anonymous_id;
  get diagnostics moved = row_count;
  delete from public.contributor where id = t.anonymous_id;

  update private.claim_token set used_at = now(), claimed_by = who where private.claim_token.token = t.token;
  return moved;
end $$;

revoke all on function public.begin_claim() from public, anon;
revoke all on function public.finish_claim(uuid) from public, anon;
grant execute on function public.begin_claim() to authenticated;
grant execute on function public.finish_claim(uuid) to authenticated;
