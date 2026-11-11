// Makes the major-roads file from osmium's export of the Metro Manila extract (.scratch/go-here,
// ticket 05; the owner's answer to Q178). Go here's footbridge hint asks whether a straight walk
// crosses a major road, so the file holds the trunk, primary and secondary roads, and only the
// stretches within REACH_M of a published hotspot: a walk to board or from your stop starts or
// ends at a hotspot and is never longer than that, so it can only cross a road that near.
//
// Usage: node scripts/major-roads/major-roads.mjs <features.geojsonseq> <extract_at> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';

import { majorRoadFileText } from './major-road-file.mjs';

/** Go here's widest walk (WIDER_REACH_M in one-ride-options.ts; the unit check holds them equal). */
export const REACH_M = 1000;
/** The roads the hint names, as OpenStreetMap tags them. Their links are ramps, not crossings. */
export const ROAD_KINDS = ['trunk', 'primary', 'secondary'];

/** How far a dropped vertex may sit off the line: well under a road's width. */
export const SIMPLIFY_M = 3;

const RECORD_SEPARATOR = '\u001e';
const RADIANS = Math.PI / 180;
const EARTH_M = 6371000;
const INDEX = new URL('../../public/data/index.v5.json', import.meta.url);
const rounded = ([x, y]) => [+x.toFixed(5), +y.toFixed(5)];

/** Metres from point p to segment ab, flat-earth around p: fine over a kilometre. */
export function metresToSegment(p, a, b) {
  const scale = Math.cos(p[1] * RADIANS);
  const flat = ([x, y]) => [(x - p[0]) * scale, y - p[1]];
  const [ax, ay] = flat(a);
  const [bx, by] = flat(b);
  const [dx, dy] = [bx - ax, by - ay];
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared));
  return EARTH_M * RADIANS * Math.hypot(ax + t * dx, ay + t * dy);
}

/** A line with the vertices that bend it by less than SIMPLIFY_M dropped (Douglas-Peucker). */
export function simplified(line) {
  const keep = new Set([0, line.length - 1]);
  const stack = [[0, line.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop();
    let farthest = -1;
    let farthestM = SIMPLIFY_M;
    for (let i = first + 1; i < last; i++) {
      const m = metresToSegment(line[i], line[first], line[last]);
      if (m > farthestM) [farthest, farthestM] = [i, m];
    }
    if (farthest === -1) continue;
    keep.add(farthest);
    stack.push([first, farthest], [farthest, last]);
  }
  return line.filter((_, i) => keep.has(i));
}

/** Lines chained where one ends at the vertex another starts from (OpenStreetMap splits roads). */
export function joinedLines(lines) {
  const key = ([x, y]) => `${x},${y}`;
  const startingAt = new Map();
  for (const line of lines) {
    if (!startingAt.has(key(line[0]))) startingAt.set(key(line[0]), []);
    startingAt.get(key(line[0])).push(line);
  }
  const used = new Set();
  const next = (vertex) => startingAt.get(key(vertex))?.find((line) => !used.has(line));
  const joined = [];
  // Start from lines nothing runs into, then whatever is left (loops).
  const ends = new Set(lines.flatMap((line) => (next(line.at(-1)) ? [key(line.at(-1))] : [])));
  const order = [...lines.filter((line) => !ends.has(key(line[0]))), ...lines];
  for (const first of order) {
    if (used.has(first)) continue;
    used.add(first);
    const chain = [...first];
    for (let line = next(chain.at(-1)); line; line = next(chain.at(-1))) {
      used.add(line);
      chain.push(...line.slice(1));
    }
    joined.push(chain);
  }
  return joined;
}

/** Whether a segment comes within REACH_M of a hotspot, over a grid of CELL degrees. */
const CELL = 0.01;
function nearHotspots(hotspots) {
  const grid = new Map();
  for (const point of hotspots) {
    const key = `${Math.floor(point[0] / CELL)},${Math.floor(point[1] / CELL)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(point);
  }
  return (a, b) => {
    const [x0, x1] = [a[0], b[0]].map((x) => Math.floor(x / CELL)).sort((m, n) => m - n);
    const [y0, y1] = [a[1], b[1]].map((y) => Math.floor(y / CELL)).sort((m, n) => m - n);
    for (let cx = x0 - 1; cx <= x1 + 1; cx++)
      for (let cy = y0 - 1; cy <= y1 + 1; cy++)
        for (const point of grid.get(`${cx},${cy}`) ?? [])
          if (metresToSegment(point, a, b) <= REACH_M) return true;
    return false;
  };
}

/** The runs of a line's segments near a hotspot, each as a line of its own. */
function nearRuns(line, isNear) {
  const runs = [];
  let run = null;
  for (let i = 1; i < line.length; i++) {
    if (!isNear(line[i - 1], line[i])) run = null;
    else if (run) run.push(line[i]);
    else runs.push((run = [line[i - 1], line[i]]));
  }
  return runs;
}

/** The major roads near the hotspots, one entry per name and kind, its stretches as lines. */
export function majorRoadsFrom(ways, hotspots) {
  const isNear = nearHotspots(hotspots);
  const roads = new Map();
  for (const way of [...ways].sort((a, b) => a.osmId - b.osmId)) {
    const lines = nearRuns(way.line, isNear);
    if (lines.length === 0) continue;
    const key = `${way.name ?? ''}\u0000${way.kind}`;
    if (!roads.has(key)) roads.set(key, { name: way.name, kind: way.kind, lines: [] });
    roads.get(key).lines.push(...lines);
  }
  for (const road of roads.values()) {
    road.lines = joinedLines(road.lines).map((line) => simplified(line).map(rounded));
  }
  const order = (road) => `${road.name ?? '￿'}\u0000${ROAD_KINDS.indexOf(road.kind)}`;
  return [...roads.values()].sort((a, b) => order(a).localeCompare(order(b)));
}

/** osmium's GeoJSON features: the major roads' ways. */
export function inputsFrom(features) {
  return features
    .filter(
      ({ id, geometry, properties: tags = {} }) =>
        geometry?.type === 'LineString' &&
        ROAD_KINDS.includes(tags.highway) &&
        /^w\d+$/.test(id ?? ''),
    )
    .map(({ id, geometry, properties: tags }) => ({
      osmId: Number(id.slice(1)),
      kind: tags.highway,
      name: tags.name?.trim() || null,
      line: geometry.coordinates,
    }));
}

/** Every published hotspot's point, from the index the public map reads. */
export function publishedHotspots(indexText = readFileSync(INDEX, 'utf8')) {
  return JSON.parse(indexText).stops.map((stop) => stop.point.coordinates);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [input, extractAt, output] = process.argv.slice(2);
  if (!input || !extractAt || !output) {
    console.error(
      'Usage: node scripts/major-roads/major-roads.mjs <features.geojsonseq> <extract timestamp> <out.json>',
    );
    process.exit(2);
  }
  const features = readFileSync(input, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    // osmium starts each GeoJSON sequence record with an RS character.
    .map((line) => JSON.parse(line.startsWith(RECORD_SEPARATOR) ? line.slice(1) : line));
  const roads = majorRoadsFrom(inputsFrom(features), publishedHotspots());
  writeFileSync(output, majorRoadFileText({ extractAt, roads }));
  console.error(
    `${roads.length} major roads near the hotspots, ${roads.filter((r) => r.name).length} named.`,
  );
}
