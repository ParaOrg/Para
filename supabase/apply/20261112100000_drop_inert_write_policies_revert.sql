-- ParaPo — undo drop_inert_write_policies: the twelve write policies of 0005 and 0015 on route,
-- route_variant, stop and route_stop come back as they were, and the ledger row goes. They let
-- nothing through while lock_map_tables stands. Touches no data. One transaction; safe to run twice.
begin;
drop policy if exists route_insert on public.route;
drop policy if exists route_update on public.route;
drop policy if exists route_delete on public.route;
drop policy if exists route_variant_insert on public.route_variant;
drop policy if exists route_variant_update on public.route_variant;
drop policy if exists route_variant_delete on public.route_variant;
drop policy if exists stop_insert on public.stop;
drop policy if exists stop_update on public.stop;
drop policy if exists stop_delete on public.stop;
drop policy if exists route_stop_insert on public.route_stop;
drop policy if exists route_stop_update on public.route_stop;
drop policy if exists route_stop_delete on public.route_stop;
create policy route_insert on public.route for insert to authenticated
  with check ((select auth.uid()) = owner_id and (select private.is_editor()));
create policy route_update on public.route for update to authenticated
  using ((select private.is_editor())) with check ((select private.is_editor()));
create policy route_delete on public.route for delete to authenticated
  using ((select private.is_editor()));
create policy route_variant_insert on public.route_variant for insert to authenticated
  with check ((select auth.uid()) = owner_id and (select private.is_editor()));
create policy route_variant_update on public.route_variant for update to authenticated
  using ((select private.is_editor())) with check ((select private.is_editor()));
create policy route_variant_delete on public.route_variant for delete to authenticated
  using ((select private.is_editor()));
create policy stop_insert on public.stop for insert to authenticated
  with check ((select auth.uid()) = owner_id and (select private.is_editor()));
create policy stop_update on public.stop for update to authenticated
  using ((select private.is_editor())) with check ((select private.is_editor()));
create policy stop_delete on public.stop for delete to authenticated
  using ((select private.is_editor()));
create policy route_stop_insert on public.route_stop for insert to authenticated
  with check ((select private.is_editor()));
create policy route_stop_update on public.route_stop for update to authenticated
  using ((select private.is_editor())) with check ((select private.is_editor()));
create policy route_stop_delete on public.route_stop for delete to authenticated
  using ((select private.is_editor()));
delete from supabase_migrations.schema_migrations where name = 'drop_inert_write_policies';
commit;
