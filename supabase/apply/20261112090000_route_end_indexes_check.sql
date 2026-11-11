-- ParaPo — check 20261112090000_route_end_indexes on the live project. Read-only: it changes
-- nothing. Run it after 20261112090000_route_end_indexes_apply.sql. 3 rows; every `ok` should be t.

select 1 as n, 'route_head_stop_id_idx is a usable index on public.route (head_stop_id)' as what,
  exists (
    select 1
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
    where n.nspname = 'public' and c.relname = 'route_head_stop_id_idx'
      and i.indrelid = 'public.route'::regclass
      and i.indnatts = 1 and a.attname = 'head_stop_id'
      and i.indisvalid and i.indisready and i.indpred is null
  ) as ok
union all
select 2, 'route_tail_stop_id_idx is a usable index on public.route (tail_stop_id)',
  exists (
    select 1
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
    where n.nspname = 'public' and c.relname = 'route_tail_stop_id_idx'
      and i.indrelid = 'public.route'::regclass
      and i.indnatts = 1 and a.attname = 'tail_stop_id'
      and i.indisvalid and i.indisready and i.indpred is null
  )
union all
select 3, 'the ledger has one row for route_end_indexes',
  (select count(*) from supabase_migrations.schema_migrations where name = 'route_end_indexes') = 1
order by n;
