-- Para — check 20261125090000_edsa_carousel.sql on the live project, after its apply.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it. Part one tries a station
-- of each line and one of no line, then rolls all of it back: it ends with ROLLBACK and no error.
-- Part two is read-only: 4 rows, every `ok` should be t.

-- Part one: what the check lets a station name, rolled back.
begin;
do $$
declare
  hintuan uuid := (select id from public.stop where kind = 'hintuan' and line is null limit 1);
begin
  if hintuan is null then
    raise notice 'edsa_carousel check: no plain hintuan to try a line on; part one skipped.';
    return;
  end if;
  update public.stop set line = 'EDSA-C' where id = hintuan;
  update public.stop set line = 'PRFS' where id = hintuan;
  update public.stop set line = null where id = hintuan;
  begin
    update public.stop set line = 'EDSA-X' where id = hintuan;
    raise exception 'edsa_carousel check: a station of no line, EDSA-X, was let in.';
  exception when check_violation then
    null;
  end;
end $$;
rollback;

-- Part two: read-only.
select 1 as n, 'transport_mode has busway' as what,
       exists (select 1 from pg_enum
               where enumtypid = 'public.transport_mode'::regtype and enumlabel = 'busway') as ok
union all
select 2, 'stop_line_named names EDSA-C',
       position('EDSA-C' in (select pg_get_constraintdef(oid) from pg_constraint
                             where conrelid = 'public.stop'::regclass
                               and conname = 'stop_line_named')) > 0
union all
select 3, 'the ledger has edsa_carousel once',
       (select count(*) from supabase_migrations.schema_migrations where name = 'edsa_carousel') = 1
union all
select 4, 'every saved station still names a line the check allows',
       not exists (select 1 from public.stop
                   where line is not null
                     and line not in ('LRT-1', 'LRT-2', 'MRT-3', 'PRFS', 'EDSA-C'))
order by n;
