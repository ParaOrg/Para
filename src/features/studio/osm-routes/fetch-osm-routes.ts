import {
  osmRouteIndexSchema,
  osmRouteSchema,
  type OsmRoute,
  type OsmRouteIndex,
} from './osm-route-schema';

/** Where the files are served (scripts/landmarks/build.sh writes them to public/data/). */
export const OSM_ROUTE_DIR_URL = '/data/osm-routes/v1';

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

/** The index of every OSM route the studio offers, read and checked. */
export async function fetchOsmRouteIndex(): Promise<OsmRouteIndex> {
  return osmRouteIndexSchema.parse(await fetchJson(`${OSM_ROUTE_DIR_URL}/index.json`));
}

/** One route's line, gaps, stops and provenance, read when an editor picks it. */
export async function fetchOsmRoute(id: number): Promise<OsmRoute> {
  return osmRouteSchema.parse(await fetchJson(`${OSM_ROUTE_DIR_URL}/r${id}.json`));
}
