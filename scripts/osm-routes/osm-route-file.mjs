// The studio's OSM route files (.scratch/osm-route-start): OpenStreetMap's jeepney, UV Express,
// bus and rail route relations that reach the map's panning box, for the studio's "Start from OSM
// route". osm-routes.mjs writes them from the extract; the studio reads them
// (src/features/studio/osm-routes/); the unit checks read them back.
//
// An index (index.json) with one row per relation, its coarse line for "near this tap", and one
// file per relation (r<id>.json) with its line, the gaps in it, its stops and its provenance.
// Only the studio fetches them: the public map's offline worker keeps none.
import { LANDMARK_SOURCE } from '../landmarks/landmark-file.mjs';

export const OSM_ROUTE_SCHEMA = 1;
export const OSM_ROUTE_DIR = 'public/data/osm-routes/v1';
/** The kinds, as the studio offers them. */
export const OSM_ROUTE_KINDS = ['jeepney', 'uv', 'bus', 'rail'];
/** What osmium takes from the extract: the route relations of the kinds above (and ferries' kin, left out below). */
export const OSM_ROUTE_FILTER = [
  'r/route=bus,share_taxi,minibus,trolleybus,train,light_rail,subway,monorail',
];
/** Fewer than this many of a kind means the extract or the filter broke. */
export const FEWEST = { jeepney: 200, uv: 1, bus: 200, rail: 6 };
/** Today's index is some 600 kB (110 kB gzipped); past this a filter has gone wrong. */
export const INDEX_MAX_BYTES = 1500 * 1024;
/** Today's largest route file is some 13 kB. */
export const ROUTE_MAX_BYTES = 64 * 1024;
/** A route's line, simplified to this many metres: close enough to trace along. */
export const LINE_TOLERANCE_M = 5;
/** The index's line, for "near this tap" only. */
export const COARSE_TOLERANCE_M = 100;
const LICENSE = 'ODbL-1.0';
const ATTRIBUTION = '© OpenStreetMap contributors';
const LICENSE_NOTE =
  'Derived from OpenStreetMap data, which is available under the Open Database License ' +
  '(https://opendatacommons.org/licenses/odbl/1-0/). Keep the attribution with any copy or ' +
  'anything made from it. Built by scripts/landmarks/build.sh.';
/** The relation's own tags an editor is shown, to know what the line starts from. */
const PROVENANCE_TAGS = ['source', 'source:ref', 'source:ref:2020', 'note', 'fixme', 'FIXME'];

const RAIL = ['train', 'light_rail', 'subway', 'monorail'];
const ROAD = ['bus', 'share_taxi', 'minibus', 'trolleybus'];
const JEEPNEY = /jeep|\bpuj\b/i;
const UV = /\buv\b|\bfx\b/i;

/**
 * A relation's kind, or null when it is no route the studio offers. Jeepneys are mostly tagged
 * route=bus with bus=share_taxi, under an LTFRB network, with a "T" ref for the traditional ones.
 */
export function routeKindOf(tags) {
  if (tags.type !== 'route') return null;
  if (RAIL.includes(tags.route)) return 'rail';
  if (!ROAD.includes(tags.route)) return null;
  const words = ['name', 'ref', 'network', 'operator', 'description']
    .map((key) => tags[key] ?? '')
    .join(' ');
  if (
    tags.route === 'share_taxi' ||
    tags.bus === 'share_taxi' ||
    JEEPNEY.test(words) ||
    /^T\d/.test(tags.ref ?? '')
  )
    return 'jeepney';
  if (tags.route === 'minibus' || tags.bus === 'minibus' || UV.test(words)) return 'uv';
  return 'bus';
}

/** OPL's escapes: %20% is a space, %2192% an arrow. */
const unescapeOpl = (text) =>
  text.replace(/%([0-9a-f]+)%/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));

function oplTags(text) {
  const tags = {};
  if (!text) return tags;
  for (const pair of text.split(',')) {
    const at = pair.indexOf('=');
    if (at > 0) tags[unescapeOpl(pair.slice(0, at))] = unescapeOpl(pair.slice(at + 1));
  }
  return tags;
}

/**
 * `osmium cat -f opl`'s lines as the nodes (point and tags), the ways (their nodes' ids) and the
 * relations (version, last edit, tags, members in order).
 */
export function readOpl(lines) {
  const nodes = new Map();
  const ways = new Map();
  const relations = [];
  for (const line of lines) {
    if (!line) continue;
    const [head, ...rest] = line.split(' ');
    const fields = Object.fromEntries(rest.filter(Boolean).map((f) => [f[0], f.slice(1)]));
    const id = Number(head.slice(1));
    if (head[0] === 'n' && fields.x) {
      nodes.set(id, { point: [Number(fields.x), Number(fields.y)], tags: oplTags(fields.T) });
    } else if (head[0] === 'w') {
      ways.set(id, fields.N ? fields.N.split(',').map((n) => Number(n.slice(1))) : []);
    } else if (head[0] === 'r') {
      const members = (fields.M ?? '')
        .split(',')
        .filter(Boolean)
        .map((m) => {
          const at = m.indexOf('@');
          return { type: m[0], ref: Number(m.slice(1, at)), role: unescapeOpl(m.slice(at + 1)) };
        });
      relations.push({
        id,
        version: Number(fields.v),
        timestamp: fields.t,
        tags: oplTags(fields.T),
        members,
      });
    }
  }
  return { nodes, ways, relations };
}

const M_PER_DEG = 111_320;
/** Metres between two points, flat: close enough within the box. */
export function metresBetween([lng1, lat1], [lng2, lat2]) {
  return Math.hypot(
    (lng1 - lng2) * M_PER_DEG * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180),
    (lat1 - lat2) * M_PER_DEG,
  );
}

/**
 * The route's ways, given as their nodes' ids in the relation's order, as one line: each way
 * joined at the node it shares with the line so far, turned round when it runs the other way.
 * Member order is not trusted to say which end comes first. A way that shares no node with the
 * line's end starts a new stretch after a gap; `gaps` holds, for each, the index of the line's
 * last point before it. The line is node ids; the caller turns them to points.
 */
export function chainWays(ways) {
  const line = [];
  const gaps = [];
  // Where the stretch being built starts in the line, and how many ways it has.
  let stretchStart = 0;
  let stretchWays = 0;
  for (const way of ways) {
    if (way.length < 2) continue;
    const end = line[line.length - 1];
    if (line.length > 0 && way[0] === end) line.push(...way.slice(1));
    else if (line.length > 0 && way[way.length - 1] === end)
      line.push(...[...way].reverse().slice(1));
    else if (
      stretchWays === 1 &&
      (way[0] === line[stretchStart] || way.at(-1) === line[stretchStart])
    ) {
      // The stretch's one way ran the other way round: turn it, then join.
      const turned = line.splice(stretchStart).reverse();
      line.push(...turned, ...(way[0] === turned.at(-1) ? way : [...way].reverse()).slice(1));
    } else {
      if (line.length > 0) gaps.push(line.length - 1);
      stretchStart = line.length;
      stretchWays = 0;
      line.push(...way);
    }
    stretchWays++;
  }
  return { line, gaps };
}

/** The points kept of a line within `toleranceM` of it (Douglas–Peucker), its ends always kept. */
export function simplify(points, toleranceM) {
  if (points.length <= 2) return points;
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop();
    let farthest = -1;
    let farthestM = toleranceM;
    for (let i = first + 1; i < last; i++) {
      const m = metresToSegment(points[i], points[first], points[last]);
      if (m > farthestM) [farthest, farthestM] = [i, m];
    }
    if (farthest >= 0) {
      keep[farthest] = true;
      stack.push([first, farthest], [farthest, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Metres from a point to the segment a–b. */
export function metresToSegment(p, a, b) {
  const cos = Math.cos((p[1] * Math.PI) / 180);
  const [px, py] = [(p[0] - a[0]) * cos, p[1] - a[1]];
  const [bx, by] = [(b[0] - a[0]) * cos, b[1] - a[1]];
  const length2 = bx * bx + by * by;
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / length2));
  return Math.hypot(px - t * bx, py - t * by) * M_PER_DEG;
}

const round = (value) => Math.round(value * 1e5) / 1e5;
const roundPoint = ([lng, lat]) => [round(lng), round(lat)];

/**
 * A line with gaps, simplified stretch by stretch so a gap's two ends are kept, and the gaps
 * re-counted in the simplified line: each as [index of the point before it, metres across].
 */
/** How far past the panning box a route's line is kept: the studio's map never shows more. */
export const CLIP_MARGIN_DEG = 0.02;

/**
 * A line cut to the panning box and CLIP_MARGIN_DEG around it: its longest run of points inside,
 * with the gaps in that run. A provincial bus keeps its stretch in Metro Manila and its edges;
 * `isClipped` says some of it was left out.
 */
export function clipToBox(points, gaps, box) {
  const inside = ([lng, lat]) =>
    lng >= box.west - CLIP_MARGIN_DEG &&
    lng <= box.east + CLIP_MARGIN_DEG &&
    lat >= box.south - CLIP_MARGIN_DEG &&
    lat <= box.north + CLIP_MARGIN_DEG;
  let best = [0, -1];
  let start = -1;
  points.forEach((point, i) => {
    if (inside(point) && start < 0) start = i;
    const isRunEnd = start >= 0 && (!inside(point) || i === points.length - 1);
    if (isRunEnd) {
      const end = inside(point) ? i : i - 1;
      if (end - start > best[1] - best[0]) best = [start, end];
      start = -1;
    }
  });
  const [first, last] = best;
  return {
    points: points.slice(first, last + 1),
    gaps: gaps.filter((at) => at >= first && at < last).map((at) => at - first),
    isClipped: first > 0 || last < points.length - 1,
  };
}

function simplifyWithGaps(points, gaps, toleranceM) {
  const out = [];
  const outGaps = [];
  let from = 0;
  for (const at of [...gaps, points.length - 1]) {
    const stretch = simplify(points.slice(from, at + 1), toleranceM).map(roundPoint);
    out.push(...stretch);
    if (at < points.length - 1) {
      outGaps.push([out.length - 1, Math.round(metresBetween(points[at], points[at + 1]))]);
    }
    from = at + 1;
  }
  return { line: out, gaps: outGaps };
}

/**
 * The index's line for "near this tap": the route's points in the box (a tap is never outside
 * it), simplified to COARSE_TOLERANCE_M and rounded to some 11 m. A provincial route keeps only
 * its stretch in the box.
 */
function coarseLine(line, box) {
  const inBox = line.filter(
    ([lng, lat]) => lng >= box.west && lng <= box.east && lat >= box.south && lat <= box.north,
  );
  const kept = simplify(inBox.length >= 2 ? inBox : line, COARSE_TOLERANCE_M);
  return kept.map(([lng, lat]) => [Math.round(lng * 1e4) / 1e4, Math.round(lat * 1e4) / 1e4]);
}

const isStop = (role) => role === 'stop' || role.startsWith('stop_');
const isPlatform = (role) => role === 'platform' || role.startsWith('platform_');

/**
 * One relation as the studio reads it, or null when it is no route offered, has no line, or
 * never enters the box. Its stops are the members marked stop (or, where none is, platform),
 * in order: [role, lng, lat, name].
 */
export function osmRouteFrom(relation, { nodes, ways }, box) {
  const kind = routeKindOf(relation.tags);
  if (!kind) return null;
  const wayMembers = relation.members.filter(
    (m) => m.type === 'w' && !isPlatform(m.role) && ways.has(m.ref),
  );
  const chained = chainWays(wayMembers.map((m) => ways.get(m.ref)));
  const points = chained.line.map((id) => nodes.get(id)?.point);
  if (points.length < 2 || points.some((point) => !point)) return null;
  const inBox = points.some(
    ([lng, lat]) => lng >= box.west && lng <= box.east && lat >= box.south && lat <= box.north,
  );
  if (!inBox) return null;
  const clipped = clipToBox(points, chained.gaps, box);
  const { line, gaps } = simplifyWithGaps(clipped.points, clipped.gaps, LINE_TOLERANCE_M);
  const nodeMembers = relation.members.filter((m) => m.type === 'n' && nodes.has(m.ref));
  const stopMembers = nodeMembers.filter((m) => isStop(m.role));
  const stops = (
    stopMembers.length > 0 ? stopMembers : nodeMembers.filter((m) => isPlatform(m.role))
  ).map((m) => {
    const node = nodes.get(m.ref);
    return [m.role, ...roundPoint(node.point), node.tags.name ?? ''];
  });
  const tags = relation.tags;
  return {
    id: relation.id,
    kind,
    ref: tags.ref ?? '',
    name: tags.name ?? '',
    from: tags.from ?? '',
    to: tags.to ?? '',
    network: tags.network ?? '',
    operator: tags.operator ?? '',
    version: relation.version,
    lastEdit: relation.timestamp?.slice(0, 10) ?? '',
    clipped: clipped.isClipped,
    provenance: Object.fromEntries(
      PROVENANCE_TAGS.filter((key) => tags[key]).map((key) => [key, tags[key]]),
    ),
    line,
    gaps,
    stops,
    coarse: coarseLine(line, box),
  };
}

/** Every relation offered, sorted by kind, then id. */
export function osmRoutesFrom(opl, box) {
  const order = (kind) => OSM_ROUTE_KINDS.indexOf(kind);
  return opl.relations
    .map((relation) => osmRouteFrom(relation, opl, box))
    .filter(Boolean)
    .sort((a, b) => order(a.kind) - order(b.kind) || a.id - b.id);
}

/** The header both files share: licence and credit first. */
const header = (extractAt) => ({
  schema: OSM_ROUTE_SCHEMA,
  license: LICENSE,
  attribution: ATTRIBUTION,
  license_note: LICENSE_NOTE,
  source: LANDMARK_SOURCE,
  extract_at: extractAt,
});

const headerLines = (fields) =>
  Object.entries(fields).map(
    ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`,
  );

/** The index's columns, in each row's order. */
export const INDEX_COLUMNS = [
  'id',
  'kind',
  'ref',
  'name',
  'from',
  'to',
  'network',
  'version',
  'last_edit',
  'gaps',
  'stops',
  'coarse',
];

/** The index's text: the header, then one route per line, so a monthly rebuild reads as a diff. */
export function osmRouteIndexText({ extractAt, routes }) {
  const rows = routes.map((r) =>
    JSON.stringify([
      r.id,
      r.kind,
      r.ref,
      r.name,
      r.from,
      r.to,
      r.network,
      r.version,
      r.lastEdit,
      r.gaps.length,
      r.stops.length,
      r.coarse,
    ]),
  );
  return `{\n${headerLines({ ...header(extractAt), kinds: OSM_ROUTE_KINDS, columns: INDEX_COLUMNS }).join('\n')}\n  "routes": [\n    ${rows.join(',\n    ')}\n  ]\n}\n`;
}

/** One route's file: the header, its facts, then its line, gaps and stops. */
export function osmRouteText({ extractAt, route }) {
  const facts = {
    ...header(extractAt),
    id: route.id,
    kind: route.kind,
    ref: route.ref,
    name: route.name,
    from: route.from,
    to: route.to,
    network: route.network,
    operator: route.operator,
    version: route.version,
    last_edit: route.lastEdit,
    clipped: route.clipped,
    provenance: route.provenance,
    gaps: route.gaps,
    stops: route.stops,
  };
  return `{\n${headerLines(facts).join('\n')}\n  "line": ${JSON.stringify(route.line)}\n}\n`;
}

/** The file name of a route's file. */
export const routeFileName = (id) => `r${id}.json`;

const isPoint = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);

function headerProblems(file) {
  const problems = [];
  if (file.schema !== OSM_ROUTE_SCHEMA) problems.push(`Its schema is not ${OSM_ROUTE_SCHEMA}.`);
  if (file.license !== LICENSE) problems.push(`Its licence is not ${LICENSE}.`);
  if (file.attribution !== ATTRIBUTION) problems.push(`Its attribution is not ${ATTRIBUTION}.`);
  return problems;
}

function parse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** What is wrong with the index's text, one sentence each; none when it is sound. */
export function osmRouteIndexProblems(text) {
  const problems = [];
  if (text.length > INDEX_MAX_BYTES)
    problems.push(`${text.length} bytes is over the ${INDEX_MAX_BYTES} the index may be.`);
  const file = parse(text);
  if (!file) return [...problems, 'It is not JSON.'];
  problems.push(...headerProblems(file));
  if (!Array.isArray(file.routes)) return [...problems, 'It holds no list of routes.'];
  const bad = file.routes.filter(
    (row) =>
      !Array.isArray(row) ||
      row.length !== INDEX_COLUMNS.length ||
      !Number.isInteger(row[0]) ||
      !OSM_ROUTE_KINDS.includes(row[1]) ||
      row.slice(2, 7).some((field) => typeof field !== 'string') ||
      !Number.isInteger(row[7]) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(row[8]) ||
      !Number.isInteger(row[9]) ||
      !Number.isInteger(row[10]) ||
      !Array.isArray(row[11]) ||
      row[11].length < 2 ||
      !row[11].every(isPoint),
  );
  if (bad.length > 0) problems.push(`${bad.length} routes are not the index's row.`);
  const ids = file.routes.map((row) => row?.[0]);
  if (new Set(ids).size !== ids.length) problems.push('A relation is listed twice.');
  for (const kind of OSM_ROUTE_KINDS) {
    const count = file.routes.filter((row) => row?.[1] === kind).length;
    if (count < FEWEST[kind])
      problems.push(`${count} ${kind} routes is fewer than the ${FEWEST[kind]} expected.`);
  }
  return problems;
}

/** What is wrong with one route's file, one sentence each; none when it is sound. */
export function osmRouteProblems(text) {
  const problems = [];
  if (text.length > ROUTE_MAX_BYTES)
    problems.push(`${text.length} bytes is over the ${ROUTE_MAX_BYTES} a route may be.`);
  const file = parse(text);
  if (!file) return [...problems, 'It is not JSON.'];
  problems.push(...headerProblems(file));
  if (!Number.isInteger(file.id)) problems.push('It names no relation.');
  if (!OSM_ROUTE_KINDS.includes(file.kind)) problems.push(`Its kind ${file.kind} is not offered.`);
  if (typeof file.clipped !== 'boolean') problems.push('It does not say whether it was clipped.');
  if (!Array.isArray(file.line) || file.line.length < 2 || !file.line.every(isPoint))
    problems.push('Its line is not two points or more.');
  const length = Array.isArray(file.line) ? file.line.length : 0;
  if (
    !Array.isArray(file.gaps) ||
    !file.gaps.every(
      (gap) =>
        Array.isArray(gap) &&
        Number.isInteger(gap[0]) &&
        gap[0] >= 0 &&
        gap[0] < length - 1 &&
        Number.isFinite(gap[1]),
    )
  )
    problems.push('Its gaps are not [index, metres] within its line.');
  if (
    !Array.isArray(file.stops) ||
    !file.stops.every(
      (stop) =>
        Array.isArray(stop) &&
        stop.length === 4 &&
        typeof stop[0] === 'string' &&
        isPoint(stop.slice(1, 3)) &&
        typeof stop[3] === 'string',
    )
  )
    problems.push('Its stops are not [role, lng, lat, name].');
  return problems;
}

/** Each kind's count, as the refresh PR's table: before, after, change. */
export function osmRouteCountsTable(beforeText, afterText) {
  const counts = (text) => {
    const routes = text ? (JSON.parse(text).routes ?? []) : [];
    return Object.fromEntries(
      OSM_ROUTE_KINDS.map((kind) => [kind, routes.filter((row) => row[1] === kind).length]),
    );
  };
  const [before, after] = [counts(beforeText), counts(afterText)];
  const line = (label, a, b) => `| ${label} | ${a} | ${b} | ${b - a >= 0 ? '+' : ''}${b - a} |`;
  const sum = (c) => Object.values(c).reduce((s, n) => s + n, 0);
  return [
    '| OSM routes | Before | After | Change |',
    '| --- | ---: | ---: | ---: |',
    ...OSM_ROUTE_KINDS.map((kind) => line(kind, before[kind], after[kind])),
    line('**All**', sum(before), sum(after)),
  ].join('\n');
}
