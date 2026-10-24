-- ParaPo — undo the contributor_accounts migration. Refuses, changing nothing,
-- while any contributor has a name or number (dropping the columns would lose
-- them). Claim tokens are only scratch and go. Contributions already moved by
-- finish_claim stay with the account they moved to. Safe to run twice.
begin;
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'contributor' and column_name = 'name') then
    if exists (select 1 from public.contributor where name is not null or phone is not null) then
      raise exception 'contributor_accounts revert: a contributor has a name or number, so it is not undone. Nothing was changed.';
    end if;
  end if;
end $$;
drop function if exists public.set_profile(text, text);
drop function if exists public.get_profile();
drop function if exists public.begin_claim();
drop function if exists public.finish_claim(uuid);
drop table if exists private.claim_token;
drop function if exists private.is_account();
alter table public.contributor drop column if exists name, drop column if exists phone, drop column if exists profile_updated_at;
revoke select, insert on public.contributor from authenticated;
grant select, insert on public.contributor to authenticated;
delete from supabase_migrations.schema_migrations where name = 'contributor_accounts';
commit;
