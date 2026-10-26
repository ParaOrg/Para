-- ParaPo — read-only checks after applying draft_update_own. One row per
-- check; every ok should be t.
select * from (values
  (1, 'draft_update exists, for update, to authenticated only',
   (select count(*) = 1 from pg_policies
     where schemaname = 'public' and tablename = 'draft' and policyname = 'draft_update'
       and cmd = 'UPDATE' and roles = '{authenticated}')),
  (2, 'its rule names the maker (auth.uid) and the maker-gone case (null)',
   (select qual like '%editor_id%' and qual like '%uid%' and qual like '%IS NULL%'
           and with_check like '%editor_id%'
      from pg_policies where schemaname = 'public' and tablename = 'draft' and policyname = 'draft_update')),
  (3, 'the select, insert and delete policies are still there',
   (select count(*) = 3 from pg_policies
     where schemaname = 'public' and tablename = 'draft' and policyname in ('draft_select', 'draft_insert', 'draft_delete'))),
  (4, 'row security is on and not forced, so the review functions still act on any draft',
   (select relrowsecurity and not relforcerowsecurity from pg_class where oid = 'public.draft'::regclass)),
  (5, 'the ledger has the row',
   (select count(*) = 1 from supabase_migrations.schema_migrations where name = 'draft_update_own'))
) as c(n, check_name, ok) order by n;
