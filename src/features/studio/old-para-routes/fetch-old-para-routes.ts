import {
  oldParaRouteIndexSchema,
  oldParaRouteSchema,
  type OldParaRoute,
  type OldParaRouteSummary,
} from './old-para-route-schema';

/** Where the files are served (scripts/old-para-routes/old-para-routes.mjs writes them to public/data/). */
export const OLD_PARA_ROUTE_DIR_URL = '/data/old-para-routes/v1';

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

/** Every old Para route, read and checked. */
export async function fetchOldParaRouteIndex(): Promise<OldParaRouteSummary[]> {
  return oldParaRouteIndexSchema.parse(await fetchJson(`${OLD_PARA_ROUTE_DIR_URL}/index.json`));
}

/** One route's line and gaps, read when an editor picks it: PARA-0001 is para-0001.json. */
export async function fetchOldParaRoute(paraId: string): Promise<OldParaRoute> {
  const url = `${OLD_PARA_ROUTE_DIR_URL}/${paraId.toLowerCase()}.json`;
  return oldParaRouteSchema.parse(await fetchJson(url));
}
