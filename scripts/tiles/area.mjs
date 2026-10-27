// The area the monthly tiles build covers: the box the public map can be panned across
// (METRO_MANILA in map-view.tsx), read from the source so the two cannot drift apart. Fails when a
// published route (the index and its line files) falls outside it.
// Usage: node scripts/tiles/area.mjs    prints "west,south,east,north" for Planetiler's --bounds.
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const DATA = new URL('public/data/', ROOT);
const MAP_VIEW = new URL('src/features/routes/map/map-view.tsx', ROOT);

const NUMBER = String.raw`(-?\d+(?:\.\d+)?)`;

/** METRO_MANILA's [[west, south], [east, north]] as `{ west, south, east, north }`. */
export function readPanningBox() {
  const source = readFileSync(MAP_VIEW, 'utf8');
  const match = source.match(
    new RegExp(
      String.raw`METRO_MANILA[^=]*=\s*\[\s*\[\s*${NUMBER}\s*,\s*${NUMBER}\s*\]\s*,\s*\[\s*${NUMBER}\s*,\s*${NUMBER}\s*\]`,
    ),
  );
  if (!match)
    throw new Error('METRO_MANILA was not found in map-view.tsx; update scripts/tiles/area.mjs');
  const [west, south, east, north] = match.slice(1).map(Number);
  return { west, south, east, north };
}

/** Every [lng, lat] position of the published map: overviews, hotspots and the line files. */
export function publishedPositions() {
  const positions = [];
  const walk = (coords) =>
    typeof coords[0] === 'number' ? positions.push(coords) : coords.forEach(walk);
  const index = JSON.parse(readFileSync(new URL('index.v5.json', DATA), 'utf8'));
  for (const v of index.variants) if (v.overview) walk(v.overview.coordinates);
  for (const s of index.stops) walk(s.point.coordinates);
  for (const f of readdirSync(new URL('lines/', DATA))) {
    walk(JSON.parse(readFileSync(new URL(`lines/${f}`, DATA), 'utf8')).shape.coordinates);
  }
  return positions;
}

/** The positions that fall outside the box. */
export function positionsOutside(box, positions) {
  return positions.filter(
    ([lng, lat]) => lng < box.west || lng > box.east || lat < box.south || lat > box.north,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const box = readPanningBox();
  const positions = publishedPositions();
  const outside = positionsOutside(box, positions);
  if (outside.length > 0) {
    console.error(
      `${outside.length} of ${positions.length} published positions fall outside the tiles' box ` +
        `${JSON.stringify(box)}, e.g. ${JSON.stringify(outside[0])}. Widen METRO_MANILA or fix the route.`,
    );
    process.exit(1);
  }
  console.error(`All ${positions.length} published positions are inside the box.`);
  console.log(`${box.west},${box.south},${box.east},${box.north}`);
}
