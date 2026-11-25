// The saved lines the drawing suites draw on and follow, by id (SUBJECT_LINES, published lines in
// fixtures/route-tables.mjs), so every run clicks the same roads and the router's recorded
// answers fit. On a run with the stand-ins its absence fails the run by name. On a live run, where
// editors can change the lines, the longest saved line stands in, with a warning naming it.
import { SUBJECT_LINES } from '../fixtures/route-tables.mjs';
import { IS_LIVE } from './stand-ins.mjs';

/** A subject line's feature among the saved-routes source's `features`: the drawn-on one unless named. */
export const subjectLine = (features, id = SUBJECT_LINES.drawnOn) => {
  const lines = features.filter(
    (f) => f.geometry?.type === 'LineString' && (f.geometry.coordinates?.length ?? 0) > 1,
  );
  const pinned = lines.find((f) => f.properties?.id === id);
  if (pinned) return pinned;
  if (!IS_LIVE) {
    throw new Error(
      `subject line ${id} not in the published map; re-pick and re-record (tests/e2e/README.md)`,
    );
  }
  const longest = lines.reduce(
    (a, f) => (!a || f.geometry.coordinates.length > a.geometry.coordinates.length ? f : a),
    null,
  );
  console.log(
    `::warning::subject line ${id} not in the live tables; using the longest, ${longest?.properties?.id}`,
  );
  return longest;
};

/**
 * The directions' overviews as the studio reads them (its list of route_variant), by id, kept up
 * to date on every read. Call it before the page loads.
 */
export const watchOverviews = (page) => {
  const overviews = new Map();
  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('/rest/v1/route_variant') || !url.includes('overview')) return;
    const rows = await response.json().catch(() => null);
    if (!Array.isArray(rows)) return;
    for (const row of rows) if ('overview' in row) overviews.set(row.id, row.overview);
  });
  return overviews;
};

/**
 * That a pinned line still has no overview, so the map draws its full shape, which `needs`
 * relies on. Editors can give a live line one; then the run fails here, saying so.
 */
export const assertNoOverview = (overviews, id, needs) => {
  if (!overviews.has(id)) throw new Error(`pinned line ${id} was not in the studio's list`);
  if (overviews.get(id) !== null) {
    throw new Error(
      `pinned line ${id} now has an overview${IS_LIVE ? ' live' : ''}; ${needs} needs an overview-null line, re-pick`,
    );
  }
};
