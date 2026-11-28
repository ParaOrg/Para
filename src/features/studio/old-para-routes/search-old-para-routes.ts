import { foldForSearch, matchFolded, qualityRank } from '@/features/routes/model/place-search';
import type { LngLat } from '@/shared/utils/geo';

import type { OldParaRouteSummary } from './old-para-route-schema';
import { MAX_OSM_ROUTES, NEAR_TAP_M, routesNear } from '../osm-routes/search-osm-routes';

/** The most routes a search lists, as the OSM search. */
export const MAX_OLD_PARA_ROUTES = MAX_OSM_ROUTES;

/**
 * A Para ID as an editor types it, any case: "PARA-0123", "para0123", "para 123", or the four
 * digits alone, "0123". Fewer digits without the "PARA" are a name's ("Route 12").
 */
const PARA_ID = /^(?:para[\s-]*(\d{1,4})|(\d{4}))$/i;

/** The Para ID a query types whole, or null. */
export function paraIdOf(query: string): string | null {
  const match = PARA_ID.exec(query.trim());
  const digits = match?.[1] ?? match?.[2];
  return digits ? `PARA-${digits.padStart(4, '0')}` : null;
}

/** A verified route before one pending review, and one with a line before one without. */
const trust = (route: OldParaRouteSummary) => (route.isVerified ? 0 : 2) + (route.coarse ? 0 : 1);

/**
 * The routes a query names, best first: a Para ID typed whole alone; else the routes whose name
 * matches, as place search matches a name (a word or a place in it, typos too). Equal matches
 * list the verified first, then those with a line, then by name and Para ID.
 */
export function searchOldParaRoutes(
  query: string,
  routes: readonly OldParaRouteSummary[],
): OldParaRouteSummary[] {
  const paraId = paraIdOf(query);
  const byId = paraId ? routes.filter((route) => route.paraId === paraId) : [];
  if (byId.length > 0) return byId;
  const foldedQuery = foldForSearch(query);
  if (foldedQuery === '') return [];
  return routes
    .flatMap((route) => {
      const quality = matchFolded(foldedQuery, foldForSearch(route.name));
      return quality ? [{ route, rank: qualityRank(quality) }] : [];
    })
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        trust(a.route) - trust(b.route) ||
        a.route.name.localeCompare(b.route.name) ||
        a.route.paraId.localeCompare(b.route.paraId),
    )
    .slice(0, MAX_OLD_PARA_ROUTES)
    .map(({ route }) => route);
}

/** The routes with a line passing within NEAR_TAP_M of a point, nearest first. */
export function oldParaRoutesNear(
  centre: LngLat,
  routes: readonly OldParaRouteSummary[],
): OldParaRouteSummary[] {
  const withLine = routes.flatMap((route) =>
    route.coarse ? [{ ...route, coarse: route.coarse }] : [],
  );
  return routesNear(centre, withLine, NEAR_TAP_M, (a, b) => a.paraId.localeCompare(b.paraId));
}
