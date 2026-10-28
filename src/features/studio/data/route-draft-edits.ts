import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { ServedRoute } from '@/features/routes/model/routes';
import { hintuansAlong } from '@/features/routes/model/timeline';

import { directionRows } from './direction-rows';
import type { RouteDraftDirection, RouteDraftRoute } from './drafts';
import { blankToNull, byStop, byWay, type Link, type RouteDraftState } from './route-draft-state';
import { DRAWN_ALREADY, LOOP_TAKEN, type SaveInput } from './routes-write';

// What each studio action does to a route's draft state: a direction saved,
// emptied or given its signboards, and the hintuan links a drawn line gets.
// Pure, like the state itself (route-draft-state.ts).

const emptyDirection = (id: string, reversed: boolean): RouteDraftDirection => ({
  id,
  reversed,
  direction_name: null,
  origin_terminal: null,
  destination_terminal: null,
  control_points: [],
  segments: [],
  shape: null,
  overview: null,
  confidence: 'drawn',
  borrowed_from: null,
  borrowed_part: null,
  borrowed_m: null,
  signboards: [],
  links: [],
});

/** The direction is not in the route the draft was built from: someone changed it meanwhile. */
export const DIRECTION_GONE =
  'This direction is no longer part of the route. Reload the studio to see its current state.';

/**
 * The route with one direction saved, as saveDirection would leave it: a new
 * route gets the drawn direction and the other way as an empty slot (none for
 * a loop); an existing one has the direction edited, or its empty slot this
 * way round filled. The route's facts are written for a new route and with
 * `writeRoute` (Edit route), and left alone otherwise; a loop stays a loop.
 *
 * `links` is the hintuan rule's answer for the drawn line (`fresh`) and which
 * hotspots that rule decides (`managed`): the direction's links to those are
 * replaced, and any other — a terminal the owner ticked — is kept, as
 * syncHintuanLinks does.
 */
export function withDirectionSaved(
  state: RouteDraftState,
  input: SaveInput,
  links: { fresh: readonly Link[]; managed: ReadonlySet<string> },
  makeId: () => string = () => crypto.randomUUID(),
): { state: RouteDraftState; directionId: string } {
  const fresh = state.directions.length === 0;
  const loop = fresh ? input.isLoop : state.route.is_loop;
  const route: RouteDraftRoute =
    fresh || input.writeRoute
      ? {
          signboard: blankToNull(input.signboard),
          mode: input.mode,
          fare_note: blankToNull(input.fareNote),
          via: blankToNull(input.via),
          head_stop_id: loop ? null : input.headHotspotId,
          tail_stop_id: loop ? null : input.tailHotspotId,
          is_loop: loop,
        }
      : state.route;
  if (!loop && (!route.head_stop_id || !route.tail_stop_id))
    throw new Error('A route needs a place at each end.');

  const { drawn, slot } = directionRows({ ...input, isLoop: loop }, state.subjectId);
  const target = input.directionId
    ? state.directions.find((d) => d.id === input.directionId)
    : state.directions.find((d) => d.reversed === drawn.reversed && d.shape === null);
  if (input.directionId && !target) throw new Error(DIRECTION_GONE);
  if (!target && state.directions.some((d) => d.reversed === drawn.reversed))
    throw new Error(loop ? LOOP_TAKEN : DRAWN_ALREADY);

  const freshIds = new Set(links.fresh.map((l) => l.stop_id));
  const saved = (prev: RouteDraftDirection | undefined, id: string): RouteDraftDirection => ({
    ...(prev ?? emptyDirection(id, drawn.reversed)),
    id,
    reversed: drawn.reversed,
    control_points: drawn.control_points,
    segments: drawn.segments,
    shape: drawn.shape,
    overview: drawn.overview,
    borrowed_from: drawn.borrowed_from,
    borrowed_part: drawn.borrowed_part,
    borrowed_m: drawn.borrowed_m,
    links: [
      ...(prev?.links ?? []).filter(
        (l) => !links.managed.has(l.stop_id) && !freshIds.has(l.stop_id),
      ),
      ...links.fresh,
    ].sort(byStop),
  });

  if (target) {
    return {
      state: {
        ...state,
        route,
        directions: state.directions.map((d) => (d.id === target.id ? saved(d, d.id) : d)),
      },
      directionId: target.id,
    };
  }
  const directionId = makeId();
  const made = [saved(undefined, directionId)];
  if (fresh && slot) made.push(emptyDirection(makeId(), slot.reversed));
  return {
    state: { ...state, route, directions: [...state.directions, ...made].sort(byWay) },
    directionId,
  };
}

/**
 * The route with one direction emptied, as deleteDirection leaves it: no line,
 * no links, no boards, no borrow, and nothing in the route borrowing from it.
 * Every direction emptied means the route comes down when it is approved.
 */
export function withDirectionEmptied(state: RouteDraftState, directionId: string): RouteDraftState {
  if (!state.directions.some((d) => d.id === directionId)) throw new Error(DIRECTION_GONE);
  return {
    ...state,
    directions: state.directions.map((d) => {
      if (d.id === directionId)
        return { ...emptyDirection(d.id, d.reversed), confidence: d.confidence };
      if (d.borrowed_from === directionId)
        return { ...d, borrowed_from: null, borrowed_part: null, borrowed_m: null };
      return d;
    }),
  };
}

/** The route with one direction's signboard list replaced. */
export function withSignboards(
  state: RouteDraftState,
  directionId: string,
  names: readonly string[],
): RouteDraftState {
  if (!state.directions.some((d) => d.id === directionId)) throw new Error(DIRECTION_GONE);
  return {
    ...state,
    directions: state.directions.map((d) =>
      d.id === directionId ? { ...d, signboards: [...names] } : d,
    ),
  };
}

/** The hintuan rule for one drawn line: its links, and which hotspots the rule decides. */
export function hintuanLinksFor(
  line: readonly [number, number][],
  hotspots: readonly HotspotRow[],
  route: ServedRoute,
): { fresh: Link[]; managed: Set<string> } {
  const managed = hotspots.filter(
    (h) => h.area && (h.kind === 'hintuan' || (route.isLoop === true && h.kind === 'terminal')),
  );
  return {
    fresh: hintuansAlong(line, managed, route).map(({ hotspot, index }) => ({
      stop_id: hotspot.id,
      stop_sequence: index,
    })),
    managed: new Set(managed.map((h) => h.id)),
  };
}
