// Box around every published route (line files, index overviews and hotspots) plus a margin.
// Usage: node scripts/research/tiles-bbox.mjs [marginKm=5]
import { readFileSync, readdirSync } from 'node:fs';

const DATA = new URL('../../public/data/', import.meta.url);
const marginKm = Number(process.argv[2] ?? 5);

const box = { west: Infinity, south: Infinity, east: -Infinity, north: -Infinity };
let positions = 0;
const extend = ([lng, lat]) => {
  positions += 1;
  box.west = Math.min(box.west, lng);
  box.east = Math.max(box.east, lng);
  box.south = Math.min(box.south, lat);
  box.north = Math.max(box.north, lat);
};
const walk = (coords) => (typeof coords[0] === 'number' ? extend(coords) : coords.forEach(walk));

const index = JSON.parse(readFileSync(new URL('index.v5.json', DATA), 'utf8'));
for (const v of index.variants) if (v.overview) walk(v.overview.coordinates);
for (const s of index.stops) walk(s.point.coordinates);
for (const f of readdirSync(new URL('lines/', DATA))) {
  walk(JSON.parse(readFileSync(new URL(`lines/${f}`, DATA), 'utf8')).shape.coordinates);
}

const midLat = (box.north + box.south) / 2;
const dLat = marginKm / 111.32;
const dLng = marginKm / (111.32 * Math.cos((midLat * Math.PI) / 180));
const r = (n) => Math.round(n * 1e4) / 1e4;
const padded = {
  west: r(box.west - dLng),
  south: r(box.south - dLat),
  east: r(box.east + dLng),
  north: r(box.north + dLat),
};
const kmW = (padded.east - padded.west) * 111.32 * Math.cos((midLat * Math.PI) / 180);
const kmH = (padded.north - padded.south) * 111.32;
console.log(
  JSON.stringify({ positions, routes: box, marginKm, bounds: padded, bbox: `${padded.west},${padded.south},${padded.east},${padded.north}`, sizeKm: [Math.round(kmW), Math.round(kmH)] }, null, 2),
);
