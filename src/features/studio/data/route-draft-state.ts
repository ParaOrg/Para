import type * as z from 'zod/mini';

import type { ServedRoute } from '@/features/routes/model/routes';

import {
  routeDraftPayload,
  type DraftRow,
  type RouteDraftDirection,
  type RouteDraftRoute,
} from './drafts';
import { parsed } from './read-all';
import {
  directionColumnsSchema,
  liveLinkSchema,
  liveRouteSchema,
  routePayloadSchema,
} from './route-draft-schema';
import type { SaveInput } from './routes-write';

// A route's draft as one state: built from the approved rows, from the draft
// kept for it, or from nothing for a new route, and stored as 0022's payload.
// Pure, so the unit checks and the database check
// (supabase/verify/studio-drafts.sh) hold the exact payloads the studio sends.

export interface Link {
  stop_id: string;
  stop_sequence: number;
}

/** What a draft is built on: the approved rows, or the draft already kept for them. */
export interface DraftBase {
  subjectId: string;
  isNew: boolean;
  /** The approved revision the draft was first made from; null for a new subject. */
  baseRevision: number | null;
  /** The draft being edited and the revision it was read at; null when there is none yet. */
  draft: { id: string; revision: number } | null;
}

export interface RouteDraftState extends DraftBase {
  route: RouteDraftRoute;
  /** Not in the payload (approve_draft never writes it); which hintuans a line is linked to depends on it (servedBy). */
  routeCode: string | null;
  directions: RouteDraftDirection[];
}

export const blankToNull = (s: string) => (s.trim() === '' ? null : s.trim());

/** Directions in one order, the way there first, so two builds of one state compare equal. */
export const byWay = (a: RouteDraftDirection, b: RouteDraftDirection) =>
  Number(a.reversed) - Number(b.reversed) || a.id.localeCompare(b.id);

export const byStop = (a: Link, b: Link) =>
  a.stop_sequence - b.stop_sequence || a.stop_id.localeCompare(b.stop_id);

function toDirection(
  raw: z.infer<typeof directionColumnsSchema>,
  links: Link[],
): RouteDraftDirection {
  return {
    id: raw.id,
    reversed: raw.reversed,
    direction_name: raw.direction_name ?? null,
    origin_terminal: raw.origin_terminal ?? null,
    destination_terminal: raw.destination_terminal ?? null,
    control_points: raw.control_points ?? [],
    segments: raw.segments ?? [],
    shape: raw.shape ?? null,
    overview: raw.overview ?? null,
    confidence: raw.confidence ?? 'drawn',
    borrowed_from: raw.borrowed_from ?? null,
    borrowed_part: raw.borrowed_part ?? null,
    borrowed_m: raw.borrowed_m ?? null,
    signboards: raw.signboards ?? [],
    links: [...links].sort(byStop),
  };
}

/** A route not in the database yet: no facts, no directions. */
export function newRouteState(routeId: string): RouteDraftState {
  return {
    subjectId: routeId,
    isNew: true,
    baseRevision: null,
    draft: null,
    route: {
      signboard: null,
      mode: 'jeepney',
      fare_note: null,
      via: null,
      head_stop_id: null,
      tail_stop_id: null,
      is_loop: false,
    },
    routeCode: null,
    directions: [],
  };
}

/** The approved route as its rows have it: the route, every direction, every link of each. */
export function routeStateFromLive(
  routeRaw: unknown,
  directionsRaw: unknown[],
  linksRaw: unknown[],
): RouteDraftState {
  const [r] = parsed(liveRouteSchema, [routeRaw], 'route');
  const links = parsed(liveLinkSchema, linksRaw, 'route link');
  const directions = parsed(directionColumnsSchema, directionsRaw, 'direction').map((d) =>
    toDirection(
      d,
      links
        .filter((l) => l.route_variant_id === d.id)
        .map(({ stop_id, stop_sequence }) => ({ stop_id, stop_sequence })),
    ),
  );
  const { id, revision, route_code, ...route } = r;
  return {
    subjectId: id,
    isNew: false,
    baseRevision: revision,
    draft: null,
    route,
    routeCode: route_code ?? null,
    directions: directions.sort(byWay),
  };
}

/** The route as the draft kept for it has it: what the next edit builds on. */
export function routeStateFromDraft(d: DraftRow): RouteDraftState {
  if (d.kind !== 'route') throw new Error(`Draft ${d.id} is a ${d.kind}, not a route.`);
  const [p] = parsed(routePayloadSchema, [d.payload], 'route draft');
  return {
    subjectId: d.subject_id,
    isNew: d.is_new,
    baseRevision: d.base_revision,
    draft: { id: d.id, revision: d.revision },
    route: p.route,
    routeCode: p.route_code ?? null,
    directions: p.directions.map((v) => toDirection(v, v.links)).sort(byWay),
  };
}

/** The payload a route state is stored as (0022's payload v1). */
export function routePayloadOf(state: RouteDraftState): Record<string, unknown> {
  return {
    ...routeDraftPayload(state.route, state.directions),
    route_code: state.routeCode,
  };
}

/** The route as the hintuan rule asks it (servedBy, listedAlong). */
export function servedRouteOf(
  state: RouteDraftState,
  input?: Pick<SaveInput, 'mode' | 'isLoop' | 'writeRoute'>,
): ServedRoute {
  const fresh = state.directions.length === 0 && input;
  // The mode the payload stores: a new route's, or the one Edit route writes.
  const mode = input && (fresh || input.writeRoute) ? input.mode : state.route.mode;
  return {
    mode: mode as ServedRoute['mode'],
    routeCode: state.routeCode,
    isLoop: fresh ? input.isLoop : state.route.is_loop,
  };
}
