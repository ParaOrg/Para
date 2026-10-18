import * as z from 'zod/mini';

import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow, ServedRoute } from '@/features/routes/model/routes';
import { hintuansAlong } from '@/features/routes/model/timeline';

import { directionRows } from './direction-rows';
import {
  claimDraft,
  draftOf,
  hotspotDraftPayload,
  routeDraftPayload,
  updateDraft,
  type DraftKind,
  type DraftRow,
  type ReviewResult,
  type RouteDraftDirection,
  type RouteDraftRoute,
} from './drafts';
import { hotspotColumns, hotspotLinks, type SaveHotspotInput } from './hotspots-write';
import { parsed, readAll } from './read-all';
import { DRAWN_ALREADY, LOOP_TAKEN, foldLoopKey, type SaveInput } from './routes-write';
import { requireSupabase } from './supabase';

// The studio's saves as drafts (0022): each builds the subject's whole state —
// a route with every direction and each direction's complete link set, or a
// hotspot with all its links — and stores it in `draft`. Nothing here writes
// route, route_variant, stop or route_stop: only approve_draft does, in one
// transaction, after checking nobody changed the approved rows since
// `base_revision` was read. The state is built by pure functions so the unit
// tests and the database check (supabase/verify/studio-drafts.sh) hold the
// exact payloads the studio sends.

interface Link {
  stop_id: string;
  stop_sequence: number;
}

/** What a draft is built on: the approved rows, or the draft already kept for them. */
interface DraftBase {
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

const blankToNull = (s: string) => (s.trim() === '' ? null : s.trim());

const linkSchema = z.object({ stop_id: z.string(), stop_sequence: z.number() });
const directionColumnsSchema = z.object({
  id: z.string(),
  reversed: z.boolean(),
  direction_name: z.optional(z.nullable(z.string())),
  origin_terminal: z.optional(z.nullable(z.string())),
  destination_terminal: z.optional(z.nullable(z.string())),
  control_points: z.unknown(),
  segments: z.unknown(),
  shape: z.unknown(),
  overview: z.unknown(),
  confidence: z.optional(z.string()),
  borrowed_from: z.optional(z.nullable(z.string())),
  borrowed_part: z.optional(z.nullable(z.string())),
  borrowed_m: z.optional(z.nullable(z.number())),
  signboards: z.optional(z.nullable(z.array(z.string()))),
});
const routeColumnsSchema = z.object({
  signboard: z.nullable(z.string()),
  mode: z.string(),
  fare_note: z.nullable(z.string()),
  via: z.nullable(z.string()),
  head_stop_id: z.nullable(z.string()),
  tail_stop_id: z.nullable(z.string()),
  is_loop: z.boolean(),
});
const liveRouteSchema = z.extend(routeColumnsSchema, {
  id: z.string(),
  revision: z.number(),
  route_code: z.optional(z.nullable(z.string())),
});
const liveLinkSchema = z.extend(linkSchema, { route_variant_id: z.string() });
const routePayloadSchema = z.object({
  version: z.literal(1),
  route: routeColumnsSchema,
  route_code: z.optional(z.nullable(z.string())),
  directions: z.array(z.extend(directionColumnsSchema, { links: z.array(linkSchema) })),
});
const hotspotPayloadSchema = z.object({
  version: z.literal(1),
  stop: z.looseObject({ line: z.optional(z.nullable(z.string())) }),
});

const ROUTE_COLUMNS =
  'id, revision, route_code, signboard, mode, fare_note, via, head_stop_id, tail_stop_id, is_loop';
const DIRECTION_COLUMNS =
  'id, reversed, direction_name, origin_terminal, destination_terminal, control_points, segments, shape, overview, confidence, borrowed_from, borrowed_part, borrowed_m, signboards';

/** Directions in one order, the way there first, so two builds of one state compare equal. */
const byWay = (a: RouteDraftDirection, b: RouteDraftDirection) =>
  Number(a.reversed) - Number(b.reversed) || a.id.localeCompare(b.id);

const byStop = (a: Link, b: Link) =>
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
  input?: Pick<SaveInput, 'mode' | 'isLoop'>,
): ServedRoute {
  const fresh = state.directions.length === 0 && input;
  return {
    mode: (fresh ? input.mode : state.route.mode) as ServedRoute['mode'],
    routeCode: state.routeCode,
    isLoop: fresh ? input.isLoop : state.route.is_loop,
  };
}

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

/** A hotspot's whole draft: its row as saveHotspot writes it, and every one of its links. */
export function hotspotPayloadOf(
  input: SaveHotspotInput,
  line: string | null,
): Record<string, unknown> {
  const { row, ring } = hotspotColumns(input);
  const links = hotspotLinks(input, ring, line).map((l) => ({
    route_variant_id: l.directionId,
    stop_sequence: l.sequence,
  }));
  return hotspotDraftPayload({ ...row, line }, links);
}

// --- Reads and writes.

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
  if (kept) return routeStateFromDraft(kept);
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
async function stateForNewLine(input: SaveInput): Promise<RouteDraftState> {
  const client = requireSupabase();
  const via = blankToNull(input.via);
  if (input.isLoop) {
    const { data, error } = await client
      .from('route')
      .select('id, signboard, via')
      .eq('is_loop', true);
    if (error) throw new Error(error.message);
    const key = foldLoopKey(blankToNull(input.signboard), via);
    const same = data.find((r) => foldLoopKey(r.signboard, r.via) === key);
    return same ? routeDraftState(same.id) : newRouteState(crypto.randomUUID());
  }
  if (!input.headHotspotId || !input.tailHotspotId)
    throw new Error('A route needs a place at each end.');
  let query = client
    .from('route')
    .select('id')
    .eq('head_stop_id', input.headHotspotId)
    .eq('tail_stop_id', input.tailHotspotId);
  query = via === null ? query.is('via', null) : query.eq('via', via);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return data ? routeDraftState(data.id) : newRouteState(crypto.randomUUID());
}

/**
 * The draft stored: a first one claimed with its base, a kept one replaced if
 * nobody changed it since it was read. A claim that finds another editor's
 * draft made meanwhile answers `revision_mismatch`, as a changed draft does:
 * the payload was built without it and is not stored.
 */
async function storeDraft(
  kind: DraftKind,
  base: DraftBase,
  payload: Record<string, unknown>,
): Promise<ReviewResult> {
  if (base.draft) return updateDraft(base.draft.id, base.draft.revision, payload);
  const claimed = await claimDraft(kind, base.subjectId, base.isNew, base.baseRevision, payload);
  if (claimed.code === 'ok' && claimed.created === false)
    return { code: 'revision_mismatch', draft: claimed.draft };
  return claimed;
}

export interface RouteDraftSaved {
  result: ReviewResult;
  routeId: string;
  directionId: string;
}

/** A direction's save, as a draft of its whole route. */
export async function saveRouteDraft(
  input: SaveInput,
  hotspots: readonly HotspotRow[],
): Promise<RouteDraftSaved> {
  const state = input.routeId ? await routeDraftState(input.routeId) : await stateForNewLine(input);
  const loop = state.directions.length === 0 ? input.isLoop : state.route.is_loop;
  const { shape } = directionRows({ ...input, isLoop: loop }, state.subjectId);
  const links = hintuanLinksFor(shape.coordinates, hotspots, servedRouteOf(state, input));
  const next = withDirectionSaved(state, input, links);
  const result = await storeDraft('route', next.state, routePayloadOf(next.state));
  return { result, routeId: state.subjectId, directionId: next.directionId };
}

/** A direction's delete, as a draft of its route with that direction emptied. */
export async function deleteDirectionDraft(direction: DirectionRow): Promise<ReviewResult> {
  const state = withDirectionEmptied(await routeDraftState(direction.routeId), direction.id);
  return storeDraft('route', state, routePayloadOf(state));
}

/**
 * A direction's signboard list, as a draft of its route. The files themselves
 * are uploaded as before (signboards.ts): a file only the draft lists is in
 * the bucket but unlisted, which the publish never copies.
 */
export async function signboardsDraft(
  direction: Pick<DirectionRow, 'id' | 'routeId'>,
  names: readonly string[],
): Promise<ReviewResult> {
  const state = withSignboards(await routeDraftState(direction.routeId), direction.id, names);
  return storeDraft('route', state, routePayloadOf(state));
}

/**
 * A hotspot's save, as a draft of the hotspot with all its links. A new
 * hotspot gets its id here; its station line, which the panel does not edit,
 * is carried from the draft kept for it or the approved row.
 */
export async function saveHotspotDraft(
  input: SaveHotspotInput,
): Promise<{ result: ReviewResult; hotspotId: string }> {
  if (!input.hotspotId) {
    const hotspotId = crypto.randomUUID();
    const result = await storeDraft(
      'hotspot',
      { subjectId: hotspotId, isNew: true, baseRevision: null, draft: null },
      hotspotPayloadOf(input, null),
    );
    return { result, hotspotId };
  }
  const hotspotId = input.hotspotId;
  const kept = await draftOf('hotspot', hotspotId);
  let base: DraftBase;
  let line: string | null;
  if (kept) {
    const [p] = parsed(hotspotPayloadSchema, [kept.payload], 'hotspot draft');
    base = {
      subjectId: hotspotId,
      isNew: kept.is_new,
      baseRevision: kept.base_revision,
      draft: { id: kept.id, revision: kept.revision },
    };
    line = p.stop.line ?? null;
  } else {
    const { data, error } = await requireSupabase()
      .from('stop')
      .select('revision, line')
      .eq('id', hotspotId)
      .single();
    if (error) throw new Error(error.message);
    base = { subjectId: hotspotId, isNew: false, baseRevision: data.revision, draft: null };
    line = data.line;
  }
  const result = await storeDraft('hotspot', base, hotspotPayloadOf(input, line));
  return { result, hotspotId };
}

/** What a stored draft says: the map is unchanged until it is approved. */
export const DRAFTED = 'Saved as a draft. The map changes once it is approved.';

/** A draft save's or take-down's refusal in the editor's words; null when it went through. */
export function draftRefusal(r: ReviewResult): string | null {
  switch (r.code) {
    case 'ok':
    case 'taken_down':
      return null;
    case 'revision_mismatch':
    case 'already_pending':
      return 'Someone else changed this draft since you opened it. Close this and open it again to see their version.';
    case 'conflict':
      return 'This changed on the map since you opened it. Close this and open it again.';
    case 'subject_gone':
      return 'This was deleted since you opened it.';
    case 'blocked':
      return 'A route still ends here, so it cannot come off the map.';
    case 'busy':
      return 'Another save was in progress. Try again.';
    case 'bad_payload':
    case 'payload_incomplete':
      return 'The draft was refused as incomplete. Nothing was saved.';
    default:
      return `Nothing was saved (${r.code}).`;
  }
}
