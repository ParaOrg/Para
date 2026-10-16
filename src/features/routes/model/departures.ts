import { otherBound, railBound } from './rail-codes';
import {
  directionEndHotspots,
  directionEnds,
  isDrawn,
  type RouteSummary,
  type Direction,
} from './routes';

/*
 * Choosing among directions: a route's two, those under a tap grouped by
 * where each leaves, the one a tap opens, the other way round, and those
 * sharing an end. Split from routes.ts, 2026-09-29.
 */

/** One route with its directions, for a sheet that lists routes, not directions. */
export interface RouteGroup<V extends Direction> {
  routeId: string;
  route: RouteSummary;
  directions: V[];
}

/** Directions gathered by route, in the order their routes were first met. */
function groupByRoute<V extends Direction>(directions: readonly V[]): RouteGroup<V>[] {
  const groups = new Map<string, RouteGroup<V>>();
  for (const v of directions) {
    const g = groups.get(v.routeId) ?? { routeId: v.routeId, route: v.route, directions: [] };
    g.directions.push(v);
    groups.set(v.routeId, g);
  }
  return [...groups.values()];
}

/** One place in the chooser, and the directions shown leaving it. */
export interface Departures<V extends Direction> {
  from: string;
  directions: { v: V; to: string; drawn: boolean }[];
}

/**
 * The routes under a tap one way round — outbound, or with `back` the way
 * back — gathered by the place each leaves from, in the order met. Tala →
 * SM Fairview and Tala → Novaliches read as Tala, then its two ends; the way
 * back reads SM Fairview, then Tala, and Novaliches, then Tala. The owner's
 * layout of 2026-09-25. A direction still a slot is listed, marked undrawn.
 */
export function departures<V extends Direction>(
  directions: readonly V[],
  back: boolean,
): Departures<V>[] {
  const byPlace = new Map<string, Departures<V>>();
  for (const g of groupByRoute(directions)) {
    const v = g.directions.find((d) => d.reversed === back);
    if (!v) continue;
    const { from, to } = directionEnds(v);
    const key = from.toLowerCase();
    const place = byPlace.get(key) ?? { from, directions: [] };
    place.directions.push({ v, to, drawn: isDrawn(v) });
    byPlace.set(key, place);
  }
  return [...byPlace.values()];
}

/**
 * `departures`, the drawn directions only, and no place left with none: what
 * the owner's route cards list, since he dropped "not mapped yet" from them
 * (2026-09-28) — a row that opens nothing is no row.
 */
export function drawnDepartures<V extends Direction>(
  directions: readonly V[],
  back: boolean,
): Departures<V>[] {
  return departures(directions, back)
    .map((p) => ({ ...p, directions: p.directions.filter((d) => d.drawn) }))
    .filter((p) => p.directions.length > 0);
}

/**
 * The direction a route opens with when it is picked as a whole: the
 * outbound when it has a line, else the return — predictable, and ⇄ is one
 * tap away. Decided with the owner 2026-09-22. Null only for a route with
 * nothing drawn, which no tap can reach.
 */
export function directionToOpen<V extends Direction>(directions: readonly V[]): V | null {
  return (
    directions.find((v) => !v.reversed && isDrawn(v)) ??
    directions.find(isDrawn) ??
    directions[0] ??
    null
  );
}

/**
 * The route's other direction, for the switch on a card: drawn or not, so the
 * card can say "not mapped yet" instead of offering an empty line. Null when
 * the route has only this one.
 */
export function otherDirection<V extends Direction>(all: readonly V[], of: V): V | null {
  return all.find((v) => v.routeId === of.routeId && v.id !== of.id) ?? null;
}

/**
 * Every direction of the routes sharing an end with `of`'s — the same head or
 * the same tail — its own route's first: PLAN.md's fan, an extension being
 * "grouped by the end it shares" (decided 2026-09-21; no screen groups them
 * that way yet but this), Tala – SM Fairview beside Tala – Novaliches. A
 * route that only starts where this one ends is not among them: that is a
 * change of jeep, not another way. An old file's route may carry no ends; it
 * then shares none. The trip's own route leads, so the card its ‹ lists it
 * on leads with it and wears its colour (liveries.ts: a card wears its first
 * row's route's; the owner's ask of 2026-10-12, that colours stop changing).
 */
export function sharingAnEnd<V extends Direction>(all: readonly V[], of: V): V[] {
  const { headHotspotId: head, tailHotspotId: tail } = of.route;
  const own = all.filter((v) => v.routeId === of.routeId);
  const shares = all.filter(
    (v) =>
      v.routeId !== of.routeId &&
      ((!!head && v.route.headHotspotId === head) || (!!tail && v.route.tailHotspotId === tail)),
  );
  return [...own, ...shares];
}

/**
 * The other routes out of where `of` starts — the owner's "Other routes"
 * under a trip (TimelineRouteDetailCard, 3778:3183, 2026-10-01): on Tala →
 * Novaliches, Tala → SM Fairview, and another route making the same trip,
 * if there is one. One direction each, drawn, leaving from the same hotspot
 * as `of` does; its own route's way back is SWITCH, not another route. An
 * old file's route may carry no ends; it then has none.
 */
export function otherRoutesFrom<V extends Direction>(all: readonly V[], of: V): V[] {
  const start = directionEndHotspots(of).fromHotspot;
  if (!start) return [];
  return all.filter(
    (v) => v.routeId !== of.routeId && isDrawn(v) && directionEndHotspots(v).fromHotspot === start,
  );
}

/**
 * The word for the way that is showing — Papunta, there; Pabalik, the way
 * back — which a trip's RouteTripDetailHeader says beside its vehicle. It was
 * SWITCH's word from the owner's ask of 2026-10-01 ("instead of switch on the
 * word") until 2026-10-16, when SWITCH took the other way's (switchWord).
 *
 * On a train it is the bound the riders and the operators say, Northbound or
 * Southbound, Eastbound or Westbound on LRT-2 (railBound; the owner's ask of
 * 2026-10-15). One word fits every direction on show: a list with jeeps and
 * trains, or two lines bound different ways, keeps Papunta and Pabalik, and so
 * does the ferry, which has no bound.
 */
export function wayWord(back: boolean, showing: readonly Direction[]): string {
  const bounds = new Set(showing.map(railBound));
  const [bound] = bounds;
  if (bounds.size === 1 && bound) return bound;
  return back ? 'Pabalik' : 'Papunta';
}

/**
 * The word on SWITCH: the way a tap leads to, not the way showing (the owner's
 * ask of 2026-10-16: on a Papunta card SWITCH reads Pabalik, on a Pabalik one
 * Papunta, "so right context for users"), the showing way's word being the
 * header's (wayWord). On a train it is the other bound, Southbound on a
 * Northbound card, by the same one-word-fits-all rule as wayWord's.
 */
export function switchWord(back: boolean, showing: readonly Direction[]): string {
  const bounds = new Set(showing.map(railBound));
  const [bound] = bounds;
  if (bounds.size === 1 && bound) return otherBound(bound);
  return back ? 'Papunta' : 'Pabalik';
}
