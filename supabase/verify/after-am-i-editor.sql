-- Asks public.am_i_editor() as each kind of caller, on a database that has it
-- applied (am-i-editor.sh). Every check raises when it fails; reaching the end
-- is the pass.
--   E   an account on the editor list   C   a contributor's account   A   an anonymous phone
\set ON_ERROR_STOP on

create function pg_temp.expect(label text, ok boolean) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'am_i_editor: failed: %', label; end if;
end $$;
-- Who the next statements run as; a null user is a signed-out request.
create function pg_temp.as_user(u uuid, r text default 'authenticated') returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', coalesce(u::text, ''), false);
  execute format('set role %I', r);
end $$;

\set E 'aaaa0000-0000-0000-0000-0000000000e9'
\set C 'aaaa0000-0000-0000-0000-0000000000c9'
\set A 'aaaa0000-0000-0000-0000-0000000000a9'

insert into auth.users (id) values (:'E'), (:'C'), (:'A');
insert into private.editor (user_id) values (:'E');

select pg_temp.as_user(:'E');
select pg_temp.expect('an editor is told yes', public.am_i_editor());
select pg_temp.as_user(:'C');
select pg_temp.expect('a contributor account is told no', public.am_i_editor() = false);
select pg_temp.as_user(:'A');
select pg_temp.expect('an anonymous phone is told no', public.am_i_editor() = false);
select pg_temp.as_user(null);
select pg_temp.expect('a signed-in request with no user is told no', public.am_i_editor() = false);

-- A visitor may not ask at all.
select pg_temp.as_user(null, 'anon');
do $$
begin
  perform public.am_i_editor();
  raise exception 'am_i_editor: failed: a visitor could call it';
exception when insufficient_privilege then
  null;
end $$;

reset role;
delete from private.editor where user_id = :'E';
delete from auth.users where id in (:'E', :'C', :'A');
