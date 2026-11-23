// Makes the footbridge file from osmium's export of the Metro Manila extract (.scratch/footbridges,
// ticket 01). A footbridge is the footways on a bridge that join one another (OpenStreetMap often
// draws a deck and its ramps as separate ways), kept when one of them crosses a road or a rail line
// (the owner's answer to question 1: not the bridges over creeks and in parks). Its access points
// are the elevators and steps mapped within ACCESS_M of it.
//
// Usage: node scripts/footbridges/footbridges.mjs <features.geojsonseq> <extract_at> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';

import { footbridgeFileText } from './footbridge-file.mjs';
import { readPanningBox } from '../tiles/area.mjs';

/** How near an elevator or steps node must be to a footbridge's line to lead up to it. */
export const ACCESS_M = 20;
/** The roads a footbridge is for: the major ones and their links, as OpenStreetMap tags them. */
export const ROADS = new Set(
  ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'].flatMap((h) => [h, `${h}_link`]),
);
export const RAILS = new Set(['rail', 'light_rail', 'subway']);

const RECORD_SEPARATOR = '\u001e';
const RADIANS = Math.PI / 180;
/** Straight-line metres between two [lng, lat], flat-earth: fine over a few hundred metres. */
const metres = ([ax, ay], [bx, by]) =>
  6371000 *
  Math.hypot((bx - ax) * RADIANS * Math.cos(((ay + by) / 2) * RADIANS), (by - ay) * RADIANS);
const vertexKey = ([x, y]) => `${x.toFixed(7)},${y.toFixed(7)}`;
const rounded = (line) => line.map(([x, y]) => [+x.toFixed(6), +y.toFixed(6)]);

/** Whether segments ab and cd cross: each pair of ends on opposite sides of the other. */
export function segmentsCross(a, b, c, d) {
  const side = (p, q, r) =>
    Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
}

/** The roads' and rails' segments in a grid of CELL degrees, to test a footbridge against. */
const CELL = 0.002;
const cellOf = ([x, y]) => [Math.floor(x / CELL), Math.floor(y / CELL)];
export function crossingIndex(lines) {
  const grid = new Map();
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      const [cx, cy] = cellOf([
        (line[i - 1][0] + line[i][0]) / 2,
        (line[i - 1][1] + line[i][1]) / 2,
      ]);
      const key = `${cx},${cy}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push([line[i - 1], line[i]]);
    }
  }
  /** Whether any segment of `line` crosses a road or rail in the index. */
  return (line) => {
    for (let i = 1; i < line.length; i++) {
      const [cx, cy] = cellOf([
        (line[i - 1][0] + line[i][0]) / 2,
        (line[i - 1][1] + line[i][1]) / 2,
      ]);
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (const [c, d] of grid.get(`${cx + dx},${cy + dy}`) ?? [])
            if (segmentsCross(line[i - 1], line[i], c, d)) return true;
    }
    return false;
  };
}

/** Footway-bridge ways that share a vertex, as groups: one footbridge each. */
export function joinedWays(ways) {
  const parent = ways.map((_, i) => i);
  const root = (i) => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  const firstAt = new Map();
  ways.forEach((way, i) => {
    for (const vertex of way.line) {
      const key = vertexKey(vertex);
      if (firstAt.has(key)) parent[root(i)] = root(firstAt.get(key));
      else firstAt.set(key, i);
    }
  });
  const groups = new Map();
  ways.forEach((way, i) => {
    const r = root(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(way);
  });
  return [...groups.values()];
}

const isInside = (box, [lng, lat]) =>
  lng >= box.west && lng <= box.east && lat >= box.south && lat <= box.north;

/**
 * The footbridges inside the map's panning box (`box`): joined footway-bridge ways that cross a
 * road or rail, with their access points.
 */
export function footbridgesFrom({ ways, crossings, accessPoints }, box) {
  const crosses = crossingIndex(crossings);
  const kept = joinedWays(ways).filter(
    (group) =>
      group.some((way) => way.line.some((vertex) => isInside(box, vertex))) &&
      group.some((way) => crosses(way.line)),
  );
  const footbridges = kept.map((group) => {
    const byId = [...group].sort((a, b) => a.osmId - b.osmId);
    return {
      id: `w${byId[0].osmId}`,
      name: byId.find((way) => way.name)?.name ?? null,
      isCovered: group.some((way) => way.isCovered),
      lines: byId.map((way) => rounded(way.line)),
      access: [],
    };
  });
  // Each access point goes to the one footbridge it is nearest, within ACCESS_M.
  for (const { kind, point } of accessPoints) {
    let nearest = null;
    let nearestM = ACCESS_M;
    for (const footbridge of footbridges) {
      for (const line of footbridge.lines) {
        for (const vertex of line) {
          const m = metres(point, vertex);
          if (m <= nearestM) [nearest, nearestM] = [footbridge, m];
        }
      }
    }
    nearest?.access.push({ kind, point: rounded([point])[0] });
  }
  return footbridges.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
}

/** osmium's GeoJSON features, sorted into the three inputs footbridgesFrom takes. */
export function inputsFrom(features) {
  const ways = [];
  const crossings = [];
  const accessPoints = [];
  for (const { id, geometry, properties: tags = {} } of features) {
    if (geometry?.type === 'LineString') {
      const isBridge = tags.bridge !== undefined && tags.bridge !== 'no';
      if (isBridge && tags.highway === 'footway' && /^w\d+$/.test(id ?? '')) {
        ways.push({
          osmId: Number(id.slice(1)),
          line: geometry.coordinates,
          name: tags.name?.trim() || null,
          isCovered: tags.covered === 'yes',
        });
      } else if (ROADS.has(tags.highway) || RAILS.has(tags.railway)) {
        crossings.push(geometry.coordinates);
      }
    } else if (geometry?.type === 'Point' && ['elevator', 'steps'].includes(tags.highway)) {
      accessPoints.push({ kind: tags.highway, point: geometry.coordinates });
    }
  }
  return { ways, crossings, accessPoints };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [input, extractAt, output] = process.argv.slice(2);
  if (!input || !extractAt || !output) {
    console.error(
      'Usage: node scripts/footbridges/footbridges.mjs <features.geojsonseq> <extract timestamp> <out.json>',
    );
    process.exit(2);
  }
  const features = readFileSync(input, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    // osmium starts each GeoJSON sequence record with an RS character.
    .map((line) => JSON.parse(line.startsWith(RECORD_SEPARATOR) ? line.slice(1) : line));
  const footbridges = footbridgesFrom(inputsFrom(features), readPanningBox());
  writeFileSync(output, footbridgeFileText({ extractAt, footbridges }));
  const elevators = footbridges.flatMap((f) => f.access).filter((a) => a.kind === 'elevator');
  console.error(
    `${footbridges.length} footbridges, ${footbridges.filter((f) => f.name).length} named, ` +
      `${elevators.length} elevators.`,
  );
}
