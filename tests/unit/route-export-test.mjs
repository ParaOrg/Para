// A route written out as a file (src/features/studio/data/route-export.ts):
// both directions, outbound first, each line in travel order, as CSV,
// GeoJSON or JSON.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/route-export-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportFile, routeExport } from '../../src/features/studio/data/route-export.ts';

const hotspot = (id, name, kind, coordinates) => ({
  id,
  kind,
  name,
  informal: null,
  aliases: [],
  point: { type: 'Point', coordinates },
});

const tala = hotspot('h-tala', 'Tala', 'terminal', [121.0, 14.0]);
const mid = hotspot('h-mid', 'Zabarte', 'hintuan', [121.01, 14.01]);
const fairview = hotspot('h-fv', 'SM Fairview', 'terminal', [121.02, 14.02]);
const hotspots = [tala, mid, fairview];

const route = {
  id: 'r1',
  signboard: 'TALA – SM FAIRVIEW',
  longName: null,
  mode: 'jeepney',
  fareNote: null,
  headHotspotId: 'h-tala',
  tailHotspotId: 'h-fv',
  via: null,
  name: 'Tala – SM Fairview',
};

const direction = (id, reversed, coordinates) => ({
  id,
  routeId: 'r1',
  name: reversed ? 'SM Fairview → Tala' : 'Tala → SM Fairview',
  originTerminal: null,
  destinationTerminal: null,
  shape: coordinates ? { type: 'LineString', coordinates } : null,
  reversed,
  confidence: 'drawn',
  route,
});

const outbound = direction('d-out', false, [
  [121.0, 14.0],
  [121.01, 14.01],
  [121.02, 14.02],
]);
// The return drawn from the far end: the export turns it to travel order.
const returnDrawnBackwards = direction('d-ret', true, [
  [121.0, 14.0],
  [121.02, 14.02],
]);
const slot = direction('d-ret', true, null);

const along = (id) => (id === 'd-out' ? [mid] : []);
const AT = '2026-10-13T00:00:00.000Z';

test('outbound comes first, with its places in order and its length', () => {
  const data = routeExport([returnDrawnBackwards, outbound], hotspots, along, AT);
  assert.equal(data.route.name, 'Tala – SM Fairview');
  assert.deepEqual(
    data.directions.map((v) => v.way),
    ['outbound', 'return'],
  );
  const [out] = data.directions;
  assert.deepEqual(
    out.places.map((p) => [p.order, p.name, p.kind]),
    [
      [1, 'Tala', 'terminal'],
      [2, 'Zabarte', 'hintuan'],
      [3, 'SM Fairview', 'terminal'],
    ],
  );
  assert.deepEqual(out.places[1].lngLat, [121.01, 14.01]);
  assert.ok(out.metres > 3000 && out.metres < 3200, `metres ${out.metres}`);
});

test('a line drawn from the far end is written in travel order', () => {
  const data = routeExport([outbound, returnDrawnBackwards], hotspots, along, AT);
  assert.deepEqual(data.directions[1].line, [
    [121.02, 14.02],
    [121.0, 14.0],
  ]);
});

test('a slot is listed with no line and adds no CSV rows or features', () => {
  const data = routeExport([outbound, slot], hotspots, along, AT);
  assert.equal(data.directions[1].line, null);
  assert.equal(data.directions[1].metres, null);

  const csv = exportFile(data, 'csv');
  const lines = csv.text.trimEnd().split('\r\n');
  assert.equal(lines.length, 1 + 3);

  const geo = JSON.parse(exportFile(data, 'geojson').text);
  assert.ok(geo.features.every((f) => f.properties.directionId === 'd-out'));
});

test('CSV: a header, one row per point, UTF-8 for Excel', () => {
  const data = routeExport([outbound], hotspots, along, AT);
  const file = exportFile(data, 'csv');
  assert.equal(file.fileName, 'tala-sm-fairview.csv');
  assert.ok(file.text.startsWith('﻿'));
  const [header, first] = file.text.slice(1).split('\r\n');
  assert.equal(header, 'route,direction,way,sequence,lng,lat');
  assert.equal(first, 'Tala – SM Fairview,Tala → SM Fairview,outbound,1,121,14');
});

test('CSV quotes a field holding a comma or a quote', () => {
  const named = { ...outbound, route: { ...route, name: 'Tala, "North" – SM Fairview' } };
  const file = exportFile(routeExport([named], hotspots, along, AT), 'csv');
  assert.match(file.text, /^﻿route,.*\r\n"Tala, ""North"" – SM Fairview",/);
  assert.equal(file.fileName, 'tala-north-sm-fairview.csv');
});

test('GeoJSON: a line feature per direction, then its places as points', () => {
  const file = exportFile(routeExport([outbound], hotspots, along, AT), 'geojson');
  assert.equal(file.mimeType, 'application/geo+json');
  const geo = JSON.parse(file.text);
  assert.equal(geo.type, 'FeatureCollection');
  assert.deepEqual(
    geo.features.map((f) => f.geometry.type),
    ['LineString', 'Point', 'Point', 'Point'],
  );
  assert.equal(geo.features[0].properties.routeName, 'Tala – SM Fairview');
  assert.equal(geo.features[2].properties.name, 'Zabarte');
});

test('JSON: the export as built, read back whole', () => {
  const data = routeExport([outbound, slot], hotspots, along, AT);
  const file = exportFile(data, 'json');
  assert.equal(file.fileName, 'tala-sm-fairview.json');
  assert.deepEqual(JSON.parse(file.text), data);
});
