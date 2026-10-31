// The Map Style card's Location Labels switch (src/features/routes/map/location-labels.ts): a
// basemap label is a symbol layer drawn from a source that is not GeoJSON, found by what it is and
// not by name; hiding them leaves Para's own labels alone, and showing them keeps the style's own.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/location-labels-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isBasemapLabel,
  isStationIcons,
  readLocationLabels,
  rememberLocationLabels,
  withLocationLabels,
} from '../../src/features/routes/map/location-labels.ts';

/** A style as a switch meets it: OpenFreeMap's sources and layers, with ours carried across. */
const STYLE = {
  version: 8,
  sources: {
    openmaptiles: { type: 'vector', url: 'https://tiles.example/planet' },
    ne2_shaded: { type: 'raster', url: 'https://tiles.example/ne2' },
    'saved-hotspots': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    'recording-trail': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
  },
  layers: [
    { id: 'background', type: 'background' },
    { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water' },
    { id: 'highway_name', type: 'symbol', source: 'openmaptiles', 'source-layer': 'road' },
    // Fiord hides it itself: shown again, it stays hidden.
    {
      id: 'highway_ref',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'road',
      layout: { visibility: 'none' },
    },
    {
      id: 'place_city',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      layout: { 'text-field': '{name}' },
    },
    // Coloured's transit layer: a station by its icon and its name.
    {
      id: 'poi_transit',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'poi',
      filter: ['match', ['get', 'class'], ['airport', 'bus', 'rail'], true, false],
      layout: { 'icon-image': '{class}', 'text-field': '{name}', 'text-size': 12 },
    },
    // Monochrome's stations: a name and no icon.
    {
      id: 'detail-rail-stops',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'poi',
      filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'class'], 'rail']],
      layout: { 'text-field': '{name}' },
    },
    // A shop's icon: a POI that is not a station.
    {
      id: 'poi_r1',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'poi',
      filter: ['>=', ['get', 'rank'], 1],
      layout: { 'icon-image': '{class}', 'text-field': '{name}' },
    },
    { id: 'saved-hotspot-labels', type: 'symbol', source: 'saved-hotspots' },
    { id: 'recording-trail-feet', type: 'symbol', source: 'recording-trail' },
    { id: 'recording-trail-line', type: 'line', source: 'recording-trail' },
  ],
};

const layer = (style, id) => style.layers.find((l) => l.id === id);

test('a basemap label is a symbol layer from a source that is not GeoJSON', () => {
  const labels = STYLE.layers.filter((l) => isBasemapLabel(l, STYLE.sources)).map((l) => l.id);
  assert.deepEqual(labels, [
    'highway_name',
    'highway_ref',
    'place_city',
    'poi_transit',
    'detail-rail-stops',
    'poi_r1',
  ]);
});

test('station icons: a poi layer with an icon whose filter picks the rail class', () => {
  const stations = STYLE.layers.filter((l) => isStationIcons(l)).map((l) => l.id);
  assert.deepEqual(stations, ['poi_transit'], 'not a name-only station layer, nor a shop');
});

test('hidden, the stations keep their icons and lose their names; nothing else of them changes', () => {
  const transit = layer(withLocationLabels(STYLE, false), 'poi_transit');
  assert.equal(transit.layout.visibility, undefined, 'still drawn');
  assert.equal(transit.layout['icon-image'], '{class}');
  assert.equal(transit.layout['text-field'], undefined, 'no name');
  assert.equal(transit.layout['text-size'], 12);
  assert.deepEqual(transit.filter, layer(STYLE, 'poi_transit').filter);
  assert.equal(layer(withLocationLabels(STYLE, true), 'poi_transit'), layer(STYLE, 'poi_transit'));
});

test('hidden, every basemap label is hidden and nothing else changes', () => {
  const hidden = withLocationLabels(STYLE, false);
  for (const id of ['highway_name', 'highway_ref', 'place_city', 'detail-rail-stops', 'poi_r1']) {
    assert.equal(layer(hidden, id).layout.visibility, 'none', id);
  }
  assert.equal(layer(hidden, 'place_city').layout['text-field'], '{name}', 'its layout is kept');
  for (const id of ['saved-hotspot-labels', 'recording-trail-feet', 'water', 'background']) {
    assert.equal(layer(hidden, id), layer(STYLE, id), `${id} is left as it was`);
  }
  assert.deepEqual(hidden.sources, STYLE.sources);
});

test('shown, the style is as it came: a label the style hides stays hidden', () => {
  assert.equal(withLocationLabels(STYLE, true), STYLE);
  assert.equal(layer(STYLE, 'highway_ref').layout.visibility, 'none');
  assert.equal(layer(STYLE, 'highway_name').layout, undefined);
});

test('the style handed in is left alone', () => {
  const before = JSON.stringify(STYLE);
  withLocationLabels(STYLE, false);
  assert.equal(JSON.stringify(STYLE), before);
});

/** A stand-in for the browser's storage, for `run`; or one that throws on every call. */
function withStorage(run, { isBlocked = false } = {}) {
  const stored = new Map();
  const blocked = () => {
    throw new Error('blocked');
  };
  globalThis.localStorage = isBlocked
    ? { getItem: blocked, setItem: blocked, removeItem: blocked }
    : {
        getItem: (key) => stored.get(key) ?? null,
        setItem: (key, value) => stored.set(key, String(value)),
        removeItem: (key) => stored.delete(key),
      };
  try {
    run(stored);
  } finally {
    delete globalThis.localStorage;
  }
}

test('the public pages default off, remembering only a choice away from it', () => {
  withStorage((stored) => {
    assert.equal(readLocationLabels('map'), false, 'off by default');
    rememberLocationLabels('map', true);
    assert.equal(readLocationLabels('map'), true);
    assert.deepEqual([...stored.keys()], ['para.location-labels.v1']);
    rememberLocationLabels('map', false);
    assert.equal(stored.size, 0, 'the default is no entry at all');
    stored.set('para.location-labels.v1', 'yes');
    assert.equal(readLocationLabels('map'), false, 'anything else reads as the default');
  });
});

test('the studio defaults on, under a key of its own', () => {
  withStorage((stored) => {
    assert.equal(readLocationLabels('studio'), true, 'on by default');
    rememberLocationLabels('studio', false);
    assert.equal(readLocationLabels('studio'), false);
    assert.equal(readLocationLabels('map'), false, "the public pages' choice is apart");
    assert.deepEqual([...stored.keys()], ['para.studio.location-labels.v1']);
    rememberLocationLabels('studio', true);
    assert.equal(stored.size, 0);
  });
});

test("storage that throws reads as each page's default and remembers nothing, quietly", () => {
  withStorage(
    () => {
      assert.equal(readLocationLabels('map'), false);
      assert.equal(readLocationLabels('studio'), true);
      assert.doesNotThrow(() => rememberLocationLabels('map', true));
    },
    { isBlocked: true },
  );
});
