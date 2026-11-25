-- Para — apply 20261125090000_edsa_carousel.sql to the live project, in one run.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it once. One transaction: it
-- checks the migration has not run, applies supabase/migrations/20261125090000_edsa_carousel.sql
-- (copied below unchanged), checks the result, and writes the ledger row. If any check fails it
-- raises, and nothing at all is changed, ledger included. A second run stops at step 1 and changes
-- nothing. Afterwards: 20261125090000_edsa_carousel_check.sql. Undo:
-- 20261125090000_edsa_carousel_revert.sql.
--
-- Safe to apply at any time: it adds a mode no row uses yet and lets a station name one more line.
-- Every row already saved is valid before and after.

begin;

-- 1. Before: this has not run, and the station lines are the ferry's four.
do $$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'edsa_carousel') then
    raise exception 'edsa_carousel: already applied. Nothing was changed.';
  end if;
  if not exists (select 1 from pg_constraint
                 where conrelid = 'public.stop'::regclass and conname = 'stop_line_named') then
    raise exception 'edsa_carousel: stop has no stop_line_named check (is 0012 applied?). Nothing was changed.';
  end if;
end $$;

-- >>> supabase/migrations/20261125090000_edsa_carousel.sql, unchanged
-- Para — the EDSA Carousel: the busway on EDSA, Monumento to PITX
--
-- The owner's ask, 2026-11-24: the EDSA Carousel on the map, drawn in the
-- studio. Its buses run in their own lane and stop only at their own
-- stations, so it is a line as a train (0011) and the ferry (0012) are: a
-- route whose mode is 'busway', and stations that are hintuans whose `line`
-- is 'EDSA-C'. It stops only at them, and no jeep at them (servedBy,
-- routes.ts). Unlike a train's, its route needs no `route_code`: its mode
-- names its one line (lineOfMode, busway.ts), so a route drawn in the
-- studio, whose draft never writes `route_code`, is a line all the same.
--
-- Additive, with no rewrite and no new value used here (a value added to an
-- enum cannot be used in the transaction that adds it). Reversible with
--   alter table stop drop constraint stop_line_named;
--   alter table stop add constraint stop_line_named check (line is null or line in ('LRT-1', 'LRT-2', 'MRT-3', 'PRFS'));
-- once no stop is an EDSA-C station. An enum value cannot be dropped; one no
-- row uses is harmless.
--
-- Written, not applied: the owner applies it, as postgres, from
-- supabase/apply/20261125090000_edsa_carousel_apply.sql, then records the
-- ledger version. Undo: supabase/apply/20261125090000_edsa_carousel_revert.sql.

alter type transport_mode add value if not exists 'busway';

alter table stop
  drop constraint stop_line_named,
  add constraint stop_line_named check (line is null or line in ('LRT-1', 'LRT-2', 'MRT-3', 'PRFS', 'EDSA-C'));

comment on column stop.line is
  'The line this hintuan is a station of: a train''s (LRT-1, LRT-2, MRT-3), the ferry''s (PRFS) or the EDSA Carousel''s (EDSA-C); null for every other hotspot.';
-- <<< supabase/migrations/20261125090000_edsa_carousel.sql

-- 2. After: the mode is there, and the check names all five lines.
do $$
declare
  def text := (select pg_get_constraintdef(oid) from pg_constraint
               where conrelid = 'public.stop'::regclass and conname = 'stop_line_named');
begin
  if not exists (select 1 from pg_enum
                 where enumtypid = 'public.transport_mode'::regtype and enumlabel = 'busway') then
    raise exception 'edsa_carousel: transport_mode has no busway. Nothing was changed.';
  end if;
  if def is null or position('EDSA-C' in def) = 0 or position('PRFS' in def) = 0
     or position('LRT-1' in def) = 0 or position('LRT-2' in def) = 0 or position('MRT-3' in def) = 0 then
    raise exception 'edsa_carousel: stop_line_named is %, not the five lines. Nothing was changed.', def;
  end if;
end $$;

-- 3. The ledger row, once.
insert into supabase_migrations.schema_migrations (version, name, statements)
select greatest(to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
                (select (max(version)::bigint + 1)::text from supabase_migrations.schema_migrations
                 where version ~ '^[0-9]{14}$')),
       'edsa_carousel', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'edsa_carousel');

commit;
