import { assertNotAnothersDraft } from './draft-guard';
import { draftOf } from './drafts';
import { hotspotPayloadSchema } from './hotspot-draft-state';
import { parsed, readAll } from './read-all';
import {
  blankToNull,
  newRouteState,
  routeStateFromDraft,
  routeStateFromLive,
  type DraftBase,
  type RouteDraftState,
} from './route-draft-state';
import { foldLoopKey, type SaveInput } from './routes-write';
import { requireSupabase } from './supabase';

// What a draft save reads before it builds: the draft kept for the subject,
// else its approved rows.

const ROUTE_COLUMNS =
  'id, revision, route_code, signboard, mode, fare_note, via, head_stop_id, tail_stop_id, is_loop';
const DIRECTION_COLUMNS =
  'id, reversed, direction_name, origin_terminal, destination_terminal, control_points, segments, shape, overview, confidence, borrowed_from, borrowed_part, borrowed_m, signboards';

/**
 * The route as the next draft should build on it: the draft kept for it, else
 * the approved rows. The route row is read first and alone: its revision is
 * bumped by every direction and link write (0018, 0022), so reading it before
 * the directions and links means a change landing between the reads makes the
 * draft's base older than its content, and approval answers `conflict` rather
 * than overwrite that change.
 */
export async function routeDraftState(routeId: string): Promise<RouteDraftState> {
  const kept = await draftOf('route', routeId);
  await assertNotAnothersDraft(kept);
  if (kept) return routeStateFromDraft(kept);
  return routeApprovedState(routeId);
}

/** Approved rows only, for comparison; never substitutes a saved draft. */
export async function routeApprovedState(routeId: string): Promise<RouteDraftState> {
  const client = requireSupabase();
  const route = await client.from('route').select(ROUTE_COLUMNS).eq('id', routeId).single();
  if (route.error) throw new Error(route.error.message);
  const directions = await client
    .from('route_variant')
    .select(DIRECTION_COLUMNS)
    .eq('route_id', routeId)
    .order('id');
  if (directions.error) throw new Error(directions.error.message);
  const ids = directions.data.map((d) => d.id);
  const links =
    ids.length === 0
      ? []
      : await readAll<unknown>((from, to) =>
          client
            .from('route_stop')
            .select('route_variant_id, stop_id, stop_sequence', { count: 'exact' })
            .in('route_variant_id', ids)
            .order('route_variant_id')
            .order('stop_id')
            .range(from, to),
        );
  return routeStateFromLive(route.data, directions.data, links);
}

/**
 * Where a new line lands: the route with these ends (or the loop with this
 * signboard and via) when there is one — its empty slot is filled, as
 * saveDirection's claim does — else a route of its own.
 */
export async function stateForNewLine(
  input: SaveInput,
  newRouteId: string,
): Promise<RouteDraftState> {
  const client = requireSupabase();
  const via = blankToNull(input.via);
  if (input.isLoop) {
    const { data, error } = await client
      .from('route')
      .select('id, signboard, via')
      .eq('is_loop', true)
      .eq('status', 'approved');
    if (error) throw new Error(error.message);
    const key = foldLoopKey(blankToNull(input.signboard), via);
    const same = data.find((r) => foldLoopKey(r.signboard, r.via) === key);
    return same ? routeDraftState(same.id) : newRouteState(newRouteId);
  }
  if (!input.headHotspotId || !input.tailHotspotId)
    throw new Error('A route needs a place at each end.');
  let query = client
    .from('route')
    .select('id')
    .eq('head_stop_id', input.headHotspotId)
    .eq('tail_stop_id', input.tailHotspotId)
    // As the uniqueness indexes: a taken-down route with these ends is not this one.
    .eq('status', 'approved');
  query = via === null ? query.is('via', null) : query.eq('via', via);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return data ? routeDraftState(data.id) : newRouteState(newRouteId);
}

/**
 * What a hotspot's next draft builds on: the draft kept for it, else the
 * approved row, and the station line the panel does not edit, carried from
 * whichever it is.
 */
export async function hotspotDraftBase(
  hotspotId: string,
): Promise<{ base: DraftBase; line: string | null }> {
  const kept = await draftOf('hotspot', hotspotId);
  await assertNotAnothersDraft(kept);
  if (kept) {
    const [p] = parsed(hotspotPayloadSchema, [kept.payload], 'hotspot draft');
    return {
      base: {
        subjectId: hotspotId,
        isNew: kept.is_new,
        baseRevision: kept.base_revision,
        draft: { id: kept.id, revision: kept.revision },
      },
      line: p.stop.line ?? null,
    };
  }
  const { data, error } = await requireSupabase()
    .from('stop')
    .select('revision, line')
    .eq('id', hotspotId)
    .single();
  if (error) throw new Error(error.message);
  return {
    base: { subjectId: hotspotId, isNew: false, baseRevision: data.revision, draft: null },
    line: data.line,
  };
}
