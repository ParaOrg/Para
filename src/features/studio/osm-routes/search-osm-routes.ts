import { foldForSearch, matchFolded, qualityRank } from '@/features/routes/model/place-search';
import { pointToSegmentM, type LngLat } from '@/shared/utils/geo';

import type { OsmRouteKind, OsmRouteSummary } from './osm-route-schema';

/** The most routes a search lists. */
export const MAX_OSM_ROUTES = 20;

/**
 * How near a tap a route's coarse line must pass to be listed (osmRoutesNear). The coarse line
 * is simplified to 100 m (osm-route-file.mjs), so a route drawn 40 m from the tap can sit some
 * 140 m from it: the list errs on showing one more.
 */
export const NEAR_TAP_M = 140;

const KIND_ORDER: readonly OsmRouteKind[] = ['jeepney', 'uv', 'bus', 'rail'];

/** A relation id as an editor types it: "10183711" or "r10183711". */
const RELATION_ID = /^r?(\d+)$/i;

/** How well a route answers the query, 0 the best; null when it does not. */
function rankOf(foldedQuery: string, route: OsmRouteSummary): number | null {
  const ref = foldForSearch(route.ref);
  if (ref !== '' && ref === foldedQuery) return 0;
  if (ref !== '' && ref.startsWith(foldedQuery)) return 1;
  const qualities = [route.name, route.from, route.to]
    .map((text) => matchFolded(foldedQuery, foldForSearch(text)))
    .flatMap((quality) => (quality ? [qualityRank(quality)] : []));
  return qualities.length > 0 ? 2 + Math.min(...qualities) : null;
}

/**
 * The routes a query names, best first: a relation id ("r10183711") alone; else the ref typed
 * whole ("T436"), then a ref that starts with it, then the name, the "from" or the "to" (as
 * place search matches a name, typos too). Equal matches list jeepneys first, then by name.
 */
export function searchOsmRoutes(
  query: string,
  routes: readonly OsmRouteSummary[],
): OsmRouteSummary[] {
  const trimmed = query.trim();
  const id = RELATION_ID.exec(trimmed)?.[1];
  if (id) {
    const byId = routes.filter((route) => String(route.id) === id);
    if (byId.length > 0) return byId;
  }
  const foldedQuery = foldForSearch(trimmed);
  if (foldedQuery === '') return [];
  return routes
    .flatMap((route) => {
      const rank = rankOf(foldedQuery, route);
      return rank === null ? [] : [{ route, rank }];
    })
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        KIND_ORDER.indexOf(a.route.kind) - KIND_ORDER.indexOf(b.route.kind) ||
        a.route.name.localeCompare(b.route.name),
    )
    .slice(0, MAX_OSM_ROUTES)
    .map(({ route }) => route);
}

/** Metres from a point to a line. */
export function metresToLine(point: LngLat, line: readonly LngLat[]): number {
  let nearest = Infinity;
  for (let i = 1; i < line.length; i++) {
    const metres = pointToSegmentM(point, line[i - 1], line[i]);
    if (metres < nearest) nearest = metres;
  }
  return nearest;
}

/**
 * The routes whose coarse line passes within `radiusM` of a tap, nearest first (`compare` breaks
 * a tie), at most MAX_OSM_ROUTES. The OSM and old Para pickers share it.
 */
export function routesNear<T extends { coarse: readonly LngLat[] }>(
  tap: LngLat,
  routes: readonly T[],
  radiusM: number,
  compare: (a: T, b: T) => number,
): T[] {
  return routes
    .map((route) => ({ route, metres: metresToLine(tap, route.coarse) }))
    .filter(({ metres }) => metres <= radiusM)
    .sort((a, b) => a.metres - b.metres || compare(a.route, b.route))
    .slice(0, MAX_OSM_ROUTES)
    .map(({ route }) => route);
}

/** The OSM routes whose line passes within `radiusM` of a tap, nearest first, at most MAX_OSM_ROUTES. */
export function osmRoutesNear(
  tap: LngLat,
  routes: readonly OsmRouteSummary[],
  radiusM: number = NEAR_TAP_M,
): OsmRouteSummary[] {
  return routesNear(tap, routes, radiusM, (a, b) => a.id - b.id);
}
