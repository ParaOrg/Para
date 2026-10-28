// The basemap's rail station names hidden near Para's own stations
// (src/features/routes/map/station-mask.ts).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/station-mask-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  maskStations,
  maskedStyle,
  stationMask,
} from '../../src/features/routes/map/station-mask.ts';

const hotspot = (id, line, lng = 121.0566, lat = 14.6278) => ({
  id,
  name: id,
  kind: 'hintuan',
  point: { type: 'Point', coordinates: [lng, lat] },
  ...(line === undefined ? {} : { line }),
});

const RAIL = ['==', ['get', 'class'], 'railway'];
const POI_FILTER = ['==', ['geometry-type'], 'Point'];

/** A map that keeps its layers' filters, as MapLibre's does, handing out copies. */
function fakeMap(layers) {
  const filters = new Map(layers.map((l) => [l.id, l.filter]));
  const copy = (v) => (v === undefined ? undefined : structuredClone(v));
  return {
    set: [],
    getStyle: () => ({ layers: layers.map((l) => ({ ...l, filter: copy(filters.get(l.id)) })) }),
    getFilter: (id) => copy(filters.get(id)) ?? null,
    setFilter(id, f) {
      this.set.push(id);
      filters.set(id, copy(f));
    },
    filterOf: (id) => filters.get(id),
  };
}

test('no mask without a station of ours: a terminal or a jeepney hintuan has no line', () => {
  assert.equal(stationMask([]), null);
  assert.equal(stationMask([hotspot('jeep', null), hotspot('old')]), null);
});

test("the mask is the basemap's railway points within a ring round each station of ours", () => {
  const mask = stationMask([hotspot('anonas', 'LRT-2'), hotspot('jeep', null)]);
  assert.deepEqual(mask.slice(0, 2), ['all', RAIL]);
  const [op, geometry] = mask[2];
  assert.equal(op, 'within');
  assert.equal(geometry.type, 'MultiPolygon');
  assert.equal(geometry.coordinates.length, 1, 'one ring: the station, not the jeepney hintuan');
  const ring = geometry.coordinates[0][0];
  assert.equal(ring.length, 17, 'sixteen corners, closed');
  assert.deepEqual(ring[0], ring.at(-1));
  // 250 m round the station, about 0.0023 degrees: every corner that far, none further.
  for (const [lng, lat] of ring) {
    const metres = Math.hypot(
      (lng - 121.0566) * 111320 * Math.cos((14.6278 * Math.PI) / 180),
      (lat - 14.6278) * 111320,
    );
    assert.ok(Math.abs(metres - 250) < 1, `${metres} m`);
  }
});

test("only the basemap's place labels take it, and taking it twice does not stack", () => {
  const map = fakeMap([
    { id: 'detail-rail-stops', type: 'symbol', 'source-layer': 'poi', filter: POI_FILTER },
    { id: 'poi_r1', type: 'symbol', 'source-layer': 'poi', filter: POI_FILTER },
    {
      id: 'saved-stops-label',
      type: 'symbol',
      source: 'saved-stops',
      filter: ['==', ['get', 'kind'], 'terminal'],
    },
    { id: 'road_label', type: 'symbol', 'source-layer': 'transportation_name' },
  ]);
  const stations = [hotspot('anonas', 'LRT-2')];
  maskStations(map, stations);
  assert.deepEqual(map.set, ['detail-rail-stops', 'poi_r1']);
  const mask = stationMask(stations);
  assert.deepEqual(map.filterOf('detail-rail-stops'), ['all', POI_FILTER, ['!', mask]]);
  // The hotspots come again: the mask is replaced, not wrapped in another.
  maskStations(map, stations);
  assert.deepEqual(map.filterOf('poi_r1'), ['all', POI_FILTER, ['!', mask]]);
  // No station of ours any more: each layer has its own filter back.
  maskStations(map, [hotspot('jeep', null)]);
  assert.deepEqual(map.filterOf('detail-rail-stops'), POI_FILTER);
});

test('a legacy filter, which an expression cannot join, is left as it is', () => {
  const legacy = ['==', 'class', 'railway'];
  const map = fakeMap([{ id: 'old', type: 'symbol', 'source-layer': 'poi', filter: legacy }]);
  maskStations(map, [hotspot('anonas', 'LRT-2')]);
  assert.deepEqual(map.filterOf('old'), legacy);
});

test("a basemap switch dresses the new style with the map's mask; a map without one, as it was", () => {
  const map = fakeMap([]);
  const style = {
    version: 8,
    sources: {},
    layers: [{ id: 'poi_r7', type: 'symbol', 'source-layer': 'poi', filter: POI_FILTER }],
  };
  assert.equal(maskedStyle(style, map), style);
  const stations = [hotspot('cubao', 'MRT-3')];
  maskStations(map, stations);
  assert.deepEqual(maskedStyle(style, map).layers[0].filter, [
    'all',
    POI_FILTER,
    ['!', stationMask(stations)],
  ]);
  assert.deepEqual(style.layers[0].filter, POI_FILTER, 'the style handed in is left alone');
});
