-- ParaPo — read-only checks after applying 0022_draft_ops. One row per
-- check; every ok should be t. Privileges are read with
-- has_function_privilege, which counts grants to PUBLIC and through role
-- membership, not only the function's own ACL.
with review(fname) as (values
  ('claim_draft'), ('submit_draft'), ('send_back_draft'), ('approve_draft'),
  ('discard_draft'), ('take_down'), ('put_back')),
helper(fname) as (values
  ('require_editor'), ('text_list'), ('uuid_ok'), ('link_ok'), ('payload_ok'),
  ('lock_rows'), ('link_bumps_subjects'), ('refusal')),
fn as (
  select 'review' as part, p.oid, p.proname, p.prosecdef, p.proconfig
  from pg_proc p join review on review.fname = p.proname
  where p.pronamespace = 'public'::regnamespace
  union all
  select 'helper', p.oid, p.proname, p.prosecdef, p.proconfig
  from pg_proc p join helper on helper.fname = p.proname
  where p.pronamespace = 'private'::regnamespace
)
select * from (values
  (1, 'all seven review functions exist',
   (select count(*) = 7 from fn where part = 'review')),
  (2, 'all eight private helpers exist',
   (select count(*) = 8 from fn where part = 'helper')),
  (3, 'anon cannot execute any of them',
   (select not bool_or(has_function_privilege('anon', oid, 'EXECUTE')) from fn)),
  (4, 'PUBLIC cannot execute any of them',
   (select not bool_or(has_function_privilege('public', oid, 'EXECUTE')) from fn)),
  (5, 'authenticated can execute every review function',
   (select bool_and(has_function_privilege('authenticated', oid, 'EXECUTE')) from fn where part = 'review')),
  (6, 'authenticated cannot execute the helpers',
   (select not bool_or(has_function_privilege('authenticated', oid, 'EXECUTE')) from fn where part = 'helper')),
  (7, 'review functions are security definer',
   (select bool_and(prosecdef) from fn where part = 'review')),
  (8, 'every function pins search_path to empty',
   (select bool_and(proconfig @> array['search_path=""']) from fn)),
  (9, 'link trigger route_stop_bumps_subjects enabled',
   exists (select 1 from pg_trigger where tgname = 'route_stop_bumps_subjects'
           and tgrelid = 'public.route_stop'::regclass and tgenabled = 'O')),
  (10, 'ledger has 0022_draft_ops once',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = '0022_draft_ops'))
) as c(n, "check", ok)
order by n;
