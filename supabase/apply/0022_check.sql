-- ParaPo — read-only checks after applying 0022_draft_ops. Every query
-- should return t / the expected count.

select count(*) = 7 as "all seven review functions exist"
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('claim_draft','submit_draft','send_back_draft','approve_draft','discard_draft','take_down','put_back');

-- The anonymous role cannot call any of them.
select count(*) = 0 as "anon cannot execute the review functions"
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('claim_draft','submit_draft','send_back_draft','approve_draft','discard_draft','take_down','put_back')
  and p.proacl::text like '%anon%';

-- The private helpers are not executable by anon either.
select count(*) = 0 as "anon cannot execute the helpers"
from pg_proc p
where p.pronamespace = 'private'::regnamespace
  and p.proname in ('require_editor','refusal','text_list')
  and p.proacl::text like '%anon%';

-- Ledger row present.
select count(*) = 1 as "ledger has 0022_draft_ops"
from supabase_migrations.schema_migrations where name = '0022_draft_ops';
