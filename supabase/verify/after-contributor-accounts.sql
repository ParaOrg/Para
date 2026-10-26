-- Reads and writes as the roles of the contributor_accounts migration, on a
-- database that has it applied (contributor-accounts.sh). Every check raises
-- when it fails; reaching the end is the pass.
--   A, B, C, D   anonymous users      X, Y, Z   accounts      E   an account who is an editor
\set ON_ERROR_STOP on

create function pg_temp.fails(q text, code text, msg text) returns boolean language plpgsql as $$
begin
  execute q;
  return false;
exception when others then
  return sqlstate = code and sqlerrm like msg || '%';
end $$;
create function pg_temp.expect(label text, ok boolean) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'contributor_accounts: failed: %', label; end if;
end $$;
-- Who the next statements run as; a null user is a signed-out request.
create function pg_temp.as_user(u uuid, r text default 'authenticated') returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', coalesce(u::text, ''), false);
  execute format('set role %I', r);
end $$;

\set A 'aaaa0000-0000-0000-0000-0000000000a1'
\set B 'aaaa0000-0000-0000-0000-0000000000a2'
\set C 'aaaa0000-0000-0000-0000-0000000000a3'
\set D 'aaaa0000-0000-0000-0000-0000000000a4'
\set X 'aaaa0000-0000-0000-0000-0000000000b1'
\set Y 'aaaa0000-0000-0000-0000-0000000000b2'
\set Z 'aaaa0000-0000-0000-0000-0000000000b3'
\set E 'aaaa0000-0000-0000-0000-0000000000e1'

insert into auth.users (id, is_anonymous) values
  (:'A', true), (:'B', true), (:'C', true), (:'D', true),
  (:'X', false), (:'Y', false), (:'Z', false), (:'E', false);
insert into private.editor (user_id) values (:'E');

-- A has two uploads (one with a hinto), B one, C one and is blocked, D one, X one.
create function pg_temp.upload(u uuid, n integer) returns void language plpgsql as $$
declare cid uuid := ('11111111-0000-0000-0000-00000000' || lpad(n::text, 4, '0'))::uuid;
begin
  perform pg_temp.as_user(u);
  insert into public.contributor (id) values (u) on conflict (id) do nothing;
  insert into public.contribution (id, format_version, rules_version, consent_version, started_at, ended_at,
      sent_at, distance_m, moving_s, standing_s, lost_s, point_count, events, gaps)
    values (cid, 1, 1, 1, now() - interval '1 hour', now(), now(), 0, 0, 0, 0, 0, '[]', '[]');
end $$;
select pg_temp.upload(:'A', 1);
select pg_temp.upload(:'A', 2);
insert into public.hinto (contribution_id, seq, started_at, seconds, lat, lng, rules_version)
  values ('11111111-0000-0000-0000-000000000001', 0, now(), 30, 14.6, 121, 1);
select pg_temp.upload(:'B', 3);
select pg_temp.upload(:'C', 4);
select pg_temp.upload(:'D', 5);
select pg_temp.upload(:'X', 6);
reset role;
update public.contributor set blocked_at = now(), blocked_by = :'E', block_note = 'noisy' where id = :'C';

-- set_profile: only an account, and only good values.
select pg_temp.as_user(null);
select pg_temp.expect('set_profile refuses a signed-out caller',
  pg_temp.fails($q$ select public.set_profile('Juan', '+639171234567') $q$, '42501', 'not_signed_in'));
select pg_temp.as_user(:'A');
select pg_temp.expect('set_profile refuses an anonymous caller',
  pg_temp.fails($q$ select public.set_profile('Juan', '+639171234567') $q$, '42501', 'not_an_account'));
select pg_temp.as_user(:'X');
select pg_temp.expect('a phone number without +639 is refused',
  pg_temp.fails($q$ select public.set_profile('Juan', '09171234567') $q$, '22023', 'bad_phone'));
select pg_temp.expect('a short phone number is refused',
  pg_temp.fails($q$ select public.set_profile('Juan', '+63917123456') $q$, '22023', 'bad_phone'));
select pg_temp.expect('a null phone number is refused',
  pg_temp.fails($q$ select public.set_profile('Juan', null) $q$, '22023', 'bad_phone'));
select pg_temp.expect('a blank name is refused',
  pg_temp.fails($q$ select public.set_profile('   ', '+639171234567') $q$, '22023', 'bad_name'));
select pg_temp.expect('a name over 80 characters is refused',
  pg_temp.fails(format('select public.set_profile(%L, %L)', repeat('n', 81), '+639171234567'), '22023', 'bad_name'));
select pg_temp.expect('nothing was stored by the refusals', (select count(*) = 0 from public.get_profile() where name is not null));
select public.set_profile('  Juan dela Cruz  ', '+639171234567');
select pg_temp.expect('the name is stored trimmed, the phone as given, and the time stamped',
  (select name = 'Juan dela Cruz' and phone = '+639171234567' and profile_updated_at is not null from public.get_profile()));
select public.set_profile('Juan', '+639181234567');
select pg_temp.expect('a second call edits it',
  (select name = 'Juan' and phone = '+639181234567' from public.get_profile()));
select pg_temp.as_user(:'Y');
select public.set_profile('Maria', '+639191234567');
select pg_temp.expect('an account without a contributor row gets one, with its own profile',
  (select name = 'Maria' from public.get_profile()));

-- Who reads what.
select pg_temp.as_user(:'X');
select pg_temp.expect('a contributor cannot select the phone column',
  pg_temp.fails('select phone from public.contributor', '42501', 'permission denied'));
select pg_temp.expect('select * is refused too',
  pg_temp.fails('select * from public.contributor', '42501', 'permission denied'));
select pg_temp.expect('a contributor reads only its own name',
  (select count(*) = 1 and bool_and(name = 'Juan') from public.contributor where name is not null));
select pg_temp.expect('get_profile answers its own phone, not another''s',
  (select phone = '+639181234567' from public.get_profile()));
select pg_temp.expect('a contributor cannot insert a name around set_profile',
  pg_temp.fails($q$ insert into public.contributor (id, name) values (gen_random_uuid(), 'Sneaky') $q$, '42501', 'permission denied'));
select pg_temp.expect('a contributor cannot update its own profile columns directly',
  pg_temp.fails($q$ update public.contributor set name = 'Sneaky' $q$, '42501', 'permission denied'));
select pg_temp.expect('the claim tokens are not readable',
  pg_temp.fails('select * from private.claim_token', '42501', 'permission denied'));
select pg_temp.as_user(:'E');
select pg_temp.expect('an editor reads the names of contributors',
  (select count(*) filter (where name = 'Juan') = 1 and count(*) filter (where name = 'Maria') = 1
     from public.contributor));
select pg_temp.expect('an editor cannot select the phone',
  pg_temp.fails('select phone from public.contributor', '42501', 'permission denied'));
select pg_temp.expect('an editor''s get_profile is its own (nothing)',
  (select count(*) = 0 from public.get_profile()));
select pg_temp.as_user(null, 'anon');
select pg_temp.expect('anon reads no contributor',
  pg_temp.fails('select name from public.contributor', '42501', 'permission denied'));
select pg_temp.expect('anon cannot call set_profile',
  pg_temp.fails($q$ select public.set_profile('Juan', '+639171234567') $q$, '42501', 'permission denied'));
select pg_temp.expect('anon cannot call begin_claim',
  pg_temp.fails('select public.begin_claim()', '42501', 'permission denied'));

-- Claim: the right callers, the right errors.
select pg_temp.as_user(:'X');
select pg_temp.expect('an account cannot begin a claim',
  pg_temp.fails('select public.begin_claim()', '42501', 'not_anonymous'));
select pg_temp.as_user(:'A');
select pg_temp.expect('an anonymous user cannot finish a claim',
  pg_temp.fails($q$ select public.finish_claim(gen_random_uuid()) $q$, '42501', 'not_an_account'));
select pg_temp.as_user(null);
select pg_temp.expect('a signed-out caller cannot begin one',
  pg_temp.fails('select public.begin_claim()', '42501', 'not_signed_in'));

-- A claim moves exactly the anonymous identity's contributions.
select pg_temp.as_user(:'A');
select public.begin_claim() as t1 \gset
select public.begin_claim() as t1b \gset
select pg_temp.as_user(:'Y');
select pg_temp.expect('a newer begin_claim replaced the earlier unused token',
  pg_temp.fails(format('select public.finish_claim(%L)', :'t1'), 'P0001', 'bad_token'));
select pg_temp.expect('an unknown token is refused',
  pg_temp.fails($q$ select public.finish_claim(gen_random_uuid()) $q$, 'P0001', 'bad_token'));
select public.finish_claim(:'t1b') as moved \gset
select pg_temp.expect('two contributions moved', :moved = 2);
select pg_temp.expect('they are now Y''s',
  (select count(*) = 2 from public.contribution where contributor_id = :'Y'));
reset role;
select pg_temp.expect('the hinto went with its contribution',
  (select count(*) = 1 from public.hinto where contribution_id = '11111111-0000-0000-0000-000000000001'));
select pg_temp.expect('nothing of A''s is left, and nobody else lost or gained anything',
  (select count(*) = 0 from public.contributor where id = :'A')
  and (select count(*) = 0 from public.contribution where contributor_id = :'A')
  and (select count(*) = 1 from public.contribution where contributor_id = :'B')
  and (select count(*) = 1 from public.contribution where contributor_id = :'X')
  and (select count(*) = 1 from public.contribution where contributor_id = :'D')
  and (select count(*) = 1 from public.contribution where contributor_id = :'C')
  and (select count(*) = 6 from public.contribution));
select pg_temp.expect('Y kept its own profile and A''s auth user is left alone',
  (select name = 'Maria' from public.contributor where id = :'Y')
  and (select count(*) = 1 from auth.users where id = :'A'));
select pg_temp.as_user(:'Y');
select pg_temp.expect('the same token again, by the same account, does nothing',
  public.finish_claim(:'t1b') = 0 and (select count(*) = 2 from public.contribution where contributor_id = :'Y'));
select pg_temp.as_user(:'X');
select pg_temp.expect('a used token is refused to another account',
  pg_temp.fails(format('select public.finish_claim(%L)', :'t1b'), 'P0001', 'bad_token'));
select pg_temp.expect('and X lost nothing',
  (select count(*) = 1 from public.contribution where contributor_id = :'X'));

-- An expired token does nothing.
select pg_temp.as_user(:'B');
select public.begin_claim() as t2 \gset
reset role;
update private.claim_token set made_at = now() - interval '11 minutes' where token = :'t2';
select pg_temp.as_user(:'X');
select pg_temp.expect('an expired token is refused',
  pg_temp.fails(format('select public.finish_claim(%L)', :'t2'), 'P0001', 'token_expired'));
reset role;
select pg_temp.expect('B''s upload and contributor row are where they were',
  (select count(*) = 1 from public.contribution where contributor_id = :'B')
  and (select count(*) = 1 from public.contributor where id = :'B'));
update private.claim_token set made_at = now() - interval '9 minutes' where token = :'t2';
select pg_temp.as_user(:'X');
select pg_temp.expect('a token under 10 minutes old still works', public.finish_claim(:'t2') = 1);

-- A token made by an identity that has since become an account takes nothing.
select pg_temp.as_user(:'D');
select public.begin_claim() as t3 \gset
reset role;
update auth.users set is_anonymous = false where id = :'D';
select pg_temp.as_user(:'Z');
select pg_temp.expect('a token of an upgraded identity is refused',
  pg_temp.fails(format('select public.finish_claim(%L)', :'t3'), 'P0001', 'bad_token'));
reset role;
select pg_temp.expect('and D keeps its upload',
  (select count(*) = 1 from public.contribution where contributor_id = :'D'));

-- A block carries over to an account that had none.
select pg_temp.as_user(:'C');
select public.begin_claim() as t4 \gset
select pg_temp.as_user(:'Z');
select pg_temp.expect('the claim moves C''s one contribution', public.finish_claim(:'t4') = 1);
reset role;
select pg_temp.expect('Z''s contributor row is blocked with C''s note, and C''s row is gone',
  (select blocked_at is not null and block_note = 'noisy' and blocked_by = :'E' from public.contributor where id = :'Z')
  and (select count(*) = 0 from public.contributor where id = :'C'));
