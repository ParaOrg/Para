import { otherBound, railBound, type Bound } from './rail-codes';
import {
  directionEndHotspots,
  directionEnds,
  directionRowName,
  isDrawn,
  isLoop,
  LOOP_WORD,
  type RouteSummary,
  type Direction,
} from './routes';
import { railwayOf, type RailwayVehicle } from './vehicles';

/*
 * Choosing among directions: a route's two, those under a tap grouped by
 * where each leaves, the one a tap opens, the other way round, and those
 * sharing an end.
 */

/** One route with its directions, for a sheet that lists routes, not directions. */
interface RouteGroup<V extends Direction> {
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
  /** `to` is the row's words: the place it goes to, with its route's via (directionRowName). */
  directions: { v: V; to: string; drawn: boolean }[];
}

/**
 * The routes under a tap one way round — outbound, or with `back` the way
 * back — gathered by the place each leaves from, in the order met. Tala → SM
 * Fairview and Tala → Novaliches read as Tala, then its two ends; the way
 * back reads SM Fairview, then Tala, and Novaliches, then Tala. The owner's
 * layout. A direction still a slot is listed, marked undrawn. A loop is
 * listed whichever way round, as its own place under its name, going to the
 * word for a loop (LOOP_WORD).
 */
export function departures<V extends Direction>(
  directions: readonly V[],
  back: boolean,
): Departures<V>[] {
  const byPlace = new Map<string, Departures<V>>();
  for (const g of groupByRoute(directions)) {
    // A loop has one direction and no way back: it is listed both ways round.
    const v = g.directions.find((d) => isLoop(d) || d.reversed === back);
    if (!v) continue;
    const { from } = directionEnds(v);
    const to = directionRowName(v);
    // A loop is its own place, never the one a route of the same name leaves from.
    const key = (isLoop(v) ? 'loop:' : '') + from.toLowerCase();
    const place = byPlace.get(key) ?? { from, directions: [] };
    place.directions.push({ v, to, drawn: isDrawn(v) });
    byPlace.set(key, place);
  }
  return [...byPlace.values()];
}

/**
 * `departures`, the drawn directions only, and no place left with none: what
 * the route cards list, the owner's call: a row that opens nothing is no row.
 */
export function drawnDepartures<V extends Direction>(
  directions: readonly V[],
  back: boolean,
): Departures<V>[] {
  return departures(directions, back)
    .map((p) => ({ ...p, directions: p.directions.filter((d) => d.drawn) }))
    .filter((p) => p.directions.length > 0);
}

/** One RouteCard: a place, and the drawn directions it lists. */
export interface RouteCardGroup<V extends Direction> extends Departures<V> {
  /** What tells the card from the others in its list, and what a pick keeps as Selected. */
  card: string;
  /** A RouteCardRailway's line, a train's or Ferry; null for a road vehicle's RouteCard. */
  railway: RailwayVehicle | null;
  /** A train card's bound, railBound; null on the ferry, on a road card, or when a line's table does not know an end. */
  bound: Bound | null;
}

/**
 * The cards a list shows one way round: drawnDepartures, with every place's
 * train and ferry directions taken off to a RouteCardRailway each, one card
 * per line and bound: Cubao's LRT-2 Eastbound and its LRT-2 Westbound are two
 * cards, both Cubao. The road directions stay the place's RouteCard, first;
 * the line cards follow in the order met. A road card is known by its place,
 * a line card by its place, line and bound.
 */
export function routeCards<V extends Direction>(
  directions: readonly V[],
  back: boolean,
): RouteCardGroup<V>[] {
  return drawnDepartures(directions, back).flatMap((place) => {
    const road: RouteCardGroup<V> = {
      card: place.from,
      from: place.from,
      railway: null,
      bound: null,
      directions: [],
    };
    const lines = new Map<string, RouteCardGroup<V>>();
    for (const d of place.directions) {
      const railway = railwayOf(d.v);
      if (!railway) {
        road.directions.push(d);
        continue;
      }
      const bound = railBound(d.v);
      const card = `${place.from}|${railway}|${bound ?? ''}`;
      const group = lines.get(card) ?? { card, from: place.from, railway, bound, directions: [] };
      group.directions.push(d);
      lines.set(card, group);
    }
    return [...(road.directions.length ? [road] : []), ...lines.values()];
  });
}

/**
 * The direction a route opens with when it is picked as a whole: the outbound
 * when it has a line, else the return — predictable, and ⇄ is one tap away
 * (the owner's call). Null only for a route with nothing drawn, which no tap
 * can reach.
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
 * "grouped by the end it shares": Tala – SM Fairview beside Tala –
 * Novaliches. A route that only starts where this one ends is not among them:
 * that is a change of jeep, not another way. An old file's route may carry no
 * ends; it then shares none. The trip's own route leads, so the card its ‹
 * lists it on leads with it and wears its colour (liveries.ts: a card wears
 * its first row's route's, so a route keeps one colour; the owner's call).
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
 * The other routes out of where `of` starts — the "Other routes" under a trip
 * (TimelineRouteDetailCard, Figma 3778:3183): on Tala → Novaliches, Tala → SM
 * Fairview, and another route making the same trip, if there is one. One
 * direction each, drawn, leaving from the same hotspot as `of` does; its own
 * route's way back is SWITCH, not another route. An old file's route may
 * carry no ends; it then has none.
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
 * back — which a trip's RouteTripDetailHeader says beside its vehicle. SWITCH
 * says the other way's word (switchWord).
 *
 * On a train it is the bound the riders and the operators say, Northbound or
 * Southbound, Eastbound or Westbound on LRT-2 (railBound; the owner's call).
 * One word fits every direction on show: a list with jeeps and trains, or two
 * lines bound different ways, keeps Papunta and Pabalik, and so does the
 * ferry, which has no bound. Only loops showing, it is LOOP_WORD.
 */
export function wayWord(back: boolean, showing: readonly Direction[]): string {
  // Loops go neither there nor back: when only loops show, the word is theirs.
  if (showing.length > 0 && showing.every(isLoop)) return LOOP_WORD;
  const bounds = new Set(showing.map(railBound));
  const [bound] = bounds;
  if (bounds.size === 1 && bound) return bound;
  return back ? 'Pabalik' : 'Papunta';
}

/**
 * The word on SWITCH is the way a tap leads to, not the way showing (the
 * owner's call): on a Papunta card SWITCH reads Pabalik, on a Pabalik one
 * Papunta, so a commuter reads where a tap leads. The showing way's word is
 * the header's (wayWord). On a train it is the other bound, Southbound on a
 * Northbound card, by the same one-word-fits-all rule as wayWord's.
 */
export function switchWord(back: boolean, showing: readonly Direction[]): string {
  const bounds = new Set(showing.map(railBound));
  const [bound] = bounds;
  if (bounds.size === 1 && bound) return otherBound(bound);
  return back ? 'Papunta' : 'Pabalik';
}

/**
 * Whether the way a list is not showing has any route to turn to: the other
 * way's drawn routes, not counting loops, which are in both. What decides
 * whether a list or a card offers SWITCH at all.
 */
export function otherWayHasRoutes<V extends Direction>(
  directions: readonly V[],
  back: boolean,
): boolean {
  return (
    drawnDepartures(
      directions.filter((v) => !isLoop(v)),
      !back,
    ).length > 0
  );
}
