-- Para — undo 20261125090000_edsa_carousel.sql on the live project.
--
-- Paste this whole file into the SQL editor (role: postgres) and run it. One transaction: the
-- station check goes back to the four lines of 0012 and the ledger row goes. Refuses, changing
-- nothing, while a stop is an EDSA-C station or a route's mode is busway: take those down or change
-- them first. The enum value 'busway' stays (Postgres cannot drop one); no row uses it. Safe to run
-- twice.

begin;

do $$
begin
  if exists (select 1 from public.stop where line = 'EDSA-C') then
    raise exception 'edsa_carousel revert: a stop is still an EDSA-C station. Nothing was changed.';
  end if;
  if exists (select 1 from public.route where mode::text = 'busway') then
    raise exception 'edsa_carousel revert: a route is still an EDSA Carousel (busway). Nothing was changed.';
  end if;
end $$;

alter table public.stop
  drop constraint stop_line_named,
  add constraint stop_line_named check (line is null or line in ('LRT-1', 'LRT-2', 'MRT-3', 'PRFS'));

comment on column public.stop.line is
  'The line this hintuan is a station of: a train''s (LRT-1, LRT-2, MRT-3) or the ferry''s (PRFS); null for every other hotspot.';

delete from supabase_migrations.schema_migrations where name = 'edsa_carousel';

commit;
