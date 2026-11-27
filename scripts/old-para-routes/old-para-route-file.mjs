// The studio's old Para route files (.scratch/old-para-routes/spec.md): the old Para app's
// community routes, for the studio's "Start from an old Para route". old-para-routes.mjs writes
// them from the source file beside it; the studio reads them (src/features/studio/old-para-routes/);
// the unit checks prove a fresh build matches what is committed.
//
// An index (index.json) with one row per route, its coarse line for "near the map's centre", and
// one file per route with a line (para-0001.json) holding that line and the gaps in it. Only the
// studio fetches them: the public map's offline worker keeps none.
import { metresBetween, simplify } from '../osm-routes/osm-route-file.mjs';

export const OLD_PARA_ROUTE_SCHEMA = 1;
export const OLD_PARA_SOURCE = 'scripts/old-para-routes/old-para-routes.v1.json';
export const OLD_PARA_ROUTE_DIR = 'public/data/old-para-routes/v1';
/** The modes, as the old app names them and the studio offers them. */
export const OLD_PARA_MODES = ['jeepney', 'uv', 'bus'];
/** The source holds this many routes; it never refreshes (the old app is retired). */
export const ROUTE_COUNT = 1737;
/** A route's line, simplified to this many metres: close enough to trace along. */
export const LINE_TOLERANCE_M = 5;
/** The index's line, for "near the map's centre" only, as the OSM index's. */
export const COARSE_TOLERANCE_M = 100;
/** Parts of a line whose ends are this close are one stretch, not a gap. */
const JOINED_M = 1;
const PARA_ID = /^PARA-\d{4}$/;

const round = (value) => Math.round(value * 1e5) / 1e5;
const roundPoint = ([lng, lat]) => [round(lng), round(lat)];
const coarsePoint = ([lng, lat]) => [Math.round(lng * 1e4) / 1e4, Math.round(lat * 1e4) / 1e4];

/**
 * A GeoJSON line's parts as one line with gaps, as the OSM files hold theirs: each part joined
 * to the last where their ends meet, else after a gap, `[index of the point before it, metres]`.
 * Each stretch is simplified on its own, so a gap's two ends are kept.
 */
export function lineWithGaps(geometry) {
  const parts = geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates;
  const stretches = [];
  for (const part of parts.filter((p) => p.length > 0)) {
    const last = stretches.at(-1);
    if (last && metresBetween(last.at(-1), part[0]) <= JOINED_M) last.push(...part.slice(1));
    else stretches.push([...part]);
  }
  const line = [];
  const gaps = [];
  for (const stretch of stretches) {
    if (line.length > 0)
      gaps.push([line.length - 1, Math.round(metresBetween(line.at(-1), stretch[0]))]);
    line.push(...simplify(stretch, LINE_TOLERANCE_M).map(roundPoint));
  }
  return { line, gaps };
}

/** One source route as the studio reads it; `line` and `coarse` null where it has none. */
export function oldParaRouteFrom(source) {
  const drawn = source.line ? lineWithGaps(source.line) : null;
  const hasLine = drawn !== null && drawn.line.length >= 2;
  return {
    paraId: source.paraId,
    oldId: source.oldId,
    name: source.name.trim(),
    mode: source.mode,
    isVerified: source.isVerified,
    isLoop: source.isLoop,
    isOneway: source.isOneway,
    start: source.start ? roundPoint(source.start) : null,
    end: source.end ? roundPoint(source.end) : null,
    lengthM: source.lengthM ?? null,
    line: hasLine ? drawn.line : null,
    gaps: hasLine ? drawn.gaps : [],
    coarse: hasLine ? simplify(drawn.line, COARSE_TOLERANCE_M).map(coarsePoint) : null,
  };
}

/** Every route, in Para ID order. */
export function oldParaRoutesFrom(sourceText) {
  return JSON.parse(sourceText)
    .routes.map(oldParaRouteFrom)
    .sort((a, b) => a.paraId.localeCompare(b.paraId));
}

const header = () => ({
  schema: OLD_PARA_ROUTE_SCHEMA,
  source: "The old Para app's community routes, extracted once from the owner's backup.",
  built_from: OLD_PARA_SOURCE,
});

const headerLines = (fields) =>
  Object.entries(fields).map(
    ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`,
  );

/** The index's columns, in each row's order. */
export const INDEX_COLUMNS = [
  'para_id',
  'mode',
  'name',
  'verified',
  'loop',
  'oneway',
  'start',
  'end',
  'length_m',
  'gaps',
  'coarse',
];

/** The index's text: the header, then one route per line. */
export function oldParaRouteIndexText(routes) {
  const rows = routes.map((r) =>
    JSON.stringify([
      r.paraId,
      r.mode,
      r.name,
      r.isVerified,
      r.isLoop,
      r.isOneway,
      r.start,
      r.end,
      r.lengthM,
      r.gaps.length,
      r.coarse,
    ]),
  );
  return `{\n${headerLines({ ...header(), modes: OLD_PARA_MODES, columns: INDEX_COLUMNS }).join('\n')}\n  "routes": [\n    ${rows.join(',\n    ')}\n  ]\n}\n`;
}

/** One route's file: the header, its facts, then its line. Only a route with a line has one. */
export function oldParaRouteText(route) {
  const facts = {
    ...header(),
    para_id: route.paraId,
    old_id: route.oldId,
    name: route.name,
    mode: route.mode,
    verified: route.isVerified,
    loop: route.isLoop,
    oneway: route.isOneway,
    start: route.start,
    end: route.end,
    length_m: route.lengthM,
    gaps: route.gaps,
  };
  return `{\n${headerLines(facts).join('\n')}\n  "line": ${JSON.stringify(route.line)}\n}\n`;
}

/** The file name of a route's file: PARA-0001 → para-0001.json. */
export const routeFileName = (paraId) => `${paraId.toLowerCase()}.json`;

/** Every file the build writes, name and text, the index first. */
export function oldParaRouteFiles(sourceText) {
  const routes = oldParaRoutesFrom(sourceText);
  return [
    ['index.json', oldParaRouteIndexText(routes)],
    ...routes
      .filter((route) => route.line)
      .map((route) => [routeFileName(route.paraId), oldParaRouteText(route)]),
  ];
}

/** What is wrong with the routes, one sentence each; none when they are sound. */
export function oldParaRouteProblems(routes) {
  const problems = [];
  if (routes.length !== ROUTE_COUNT)
    problems.push(`${routes.length} routes is not the source's ${ROUTE_COUNT}.`);
  const ids = routes.map((route) => route.paraId);
  if (new Set(ids).size !== ids.length) problems.push('A Para ID is listed twice.');
  for (const route of routes) {
    const name = route.paraId;
    if (!PARA_ID.test(name)) problems.push(`${name} is not a Para ID.`);
    if (!OLD_PARA_MODES.includes(route.mode)) problems.push(`${name}: mode ${route.mode}.`);
    if (route.name === '') problems.push(`${name} has no name.`);
    if (route.line && route.gaps.some(([at]) => at < 0 || at >= route.line.length - 1))
      problems.push(`${name}: a gap falls outside its line.`);
  }
  return problems;
}
