// Makes tests/e2e/fixtures/basemap/stand-in.pbf: the one vector tile the basemap's stand-in
// (tests/e2e/lib/stand-ins.mjs) answers for every z/x/y on a run without PARA_LIVE_SERVICES.
// Built from coordinates, not from OpenFreeMap's data: one `water` polygon over the whole tile
// and one `transportation` line (class primary) across it, in the OpenMapTiles layer names the
// styles read, so the basemap draws a fill and a line as it does live. That compiles MapLibre's
// fill and line programs at load, which the suites' "a first tap compiles no GL program" checks
// expect of a real basemap.
//
// Run by hand only, when the tile needs to change: node scripts/research/make-stand-in-tile.mjs.
// The suites read the committed .pbf, never this script.
//
// It imports @maplibre/geojson-vt and @maplibre/vt-pbf, which maplibre-gl depends on: they are in
// node_modules through it, not declared in package.json. If a maplibre-gl update drops them,
// install them for the one run (npm install --no-save @maplibre/geojson-vt @maplibre/vt-pbf),
// or keep the committed tile: it does not change unless this script does.
import { writeFileSync } from 'node:fs';

import { GeoJSONVT } from '@maplibre/geojson-vt';
import { fromGeojsonVt } from '@maplibre/vt-pbf';

const OUT = new URL('../../tests/e2e/fixtures/basemap/stand-in.pbf', import.meta.url);

const layer = (features) =>
  new GeoJSONVT({ type: 'FeatureCollection', features }, { maxZoom: 0, extent: 4096 }).getTile(
    0,
    0,
    0,
  );

const water = layer([
  {
    type: 'Feature',
    properties: { class: 'ocean' },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-180, -85],
          [180, -85],
          [180, 85],
          [-180, 85],
          [-180, -85],
        ],
      ],
    },
  },
]);
const transportation = layer([
  {
    type: 'Feature',
    properties: { class: 'primary' },
    geometry: {
      type: 'LineString',
      coordinates: [
        [-90, -45],
        [90, 45],
      ],
    },
  },
]);

const tile = fromGeojsonVt({ water, transportation }, { version: 2 });
writeFileSync(OUT, tile);
console.log(`${OUT.pathname}: ${tile.length} bytes`);
