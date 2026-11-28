-- ParaPo — undo 20261128120000_refresh_draft_base_maker: refresh_draft_base is as
-- 20261105120000_review_rules wrote it again, so any editor can Keep any draft.
-- The definition below is copied unchanged from that migration. Touches no data
-- and no grant. Safe to run twice.
begin;

create or replace function public.refresh_draft_base(p_draft uuid, p_revision integer, p_base_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare d public.draft; live_revision bigint; s public.stop; p jsonb; links jsonb;
begin
  perform private.require_editor();
  select * into d from public.draft where id = p_draft for update;
  if not found then return jsonb_build_object('code', 'no_draft'); end if;
  if p_revision is null or d.revision <> p_revision then
    return jsonb_build_object('code', 'revision_mismatch', 'current_revision', d.revision);
  end if;
  if d.is_new then return jsonb_build_object('code', 'subject_exists'); end if;
  if d.kind = 'route' then
    perform private.lock_rows(array[d.subject_id], null);
    select revision into live_revision from public.route where id = d.subject_id;
  else
    perform private.lock_rows(null, array[d.subject_id]);
    select * into s from public.stop where id = d.subject_id;
    live_revision := s.revision;
  end if;
  if live_revision is null then return jsonb_build_object('code', 'subject_gone'); end if;
  if p_base_revision is null or live_revision <> p_base_revision then
    return jsonb_build_object('code', 'conflict', 'current_revision', live_revision);
  end if;
  p := d.payload;
  -- The hotspot's row lock holds its links still: every link write locks the
  -- hotspot first (0022's lock order).
  if d.kind = 'hotspot' and private.payload_ok('hotspot', p)
     and nullif(p -> 'stop' -> 'area', 'null'::jsonb) is not distinct from s.area
     and (p -> 'stop' ->> 'line') is not distinct from s.line then
    if coalesce(p -> 'stop' ->> 'kind', 'hintuan') = 'terminal' then
      -- The directions the editor ticked, from the draft (an ikot is never
      -- ticked), then the ikot that pass it now.
      select coalesce(jsonb_agg(l order by l ->> 'route_variant_id'), '[]'::jsonb) into links
      from jsonb_array_elements(p -> 'links') l
      where not exists (
        select 1 from public.route_variant v join public.route r on r.id = v.route_id
        where v.id = (l ->> 'route_variant_id')::uuid and r.is_loop);
      select links || coalesce(jsonb_agg(
               jsonb_build_object('route_variant_id', k.route_variant_id, 'stop_sequence', k.stop_sequence)
               order by k.route_variant_id), '[]'::jsonb) into links
      from public.route_stop k
      join public.route_variant v on v.id = k.route_variant_id
      join public.route r on r.id = v.route_id
      where k.stop_id = d.subject_id and r.is_loop;
    else
      select coalesce(jsonb_agg(
               jsonb_build_object('route_variant_id', k.route_variant_id, 'stop_sequence', k.stop_sequence)
               order by k.route_variant_id), '[]'::jsonb) into links
      from public.route_stop k
      where k.stop_id = d.subject_id;
    end if;
    p := jsonb_set(p, '{links}', links);
  end if;
  update public.draft set base_revision = live_revision, status = 'draft', submitted_at = null, payload = p
    where id = p_draft returning * into d;
  return jsonb_build_object('code', 'ok', 'draft', row_to_json(d));
exception when deadlock_detected or lock_not_available or query_canceled then
  return jsonb_build_object('code', 'busy');
end $$;

delete from supabase_migrations.schema_migrations where name = 'refresh_draft_base_maker';
commit;
