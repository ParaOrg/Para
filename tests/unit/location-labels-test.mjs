// The Map Style card's Location Labels switch (src/features/routes/map/location-labels.ts): a
// basemap label is a symbol layer drawn from a source that is not GeoJSON, found by what it is and
// not by name; hiding them leaves Para's own labels alone, and showing them keeps the style's own.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/location-labels-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isBasemapLabel,
  isPlaceIcons,
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
    // Coloured's transit layer, as Liberty has it: airports and bus stations (the tiles class a
    // train station `railway`, so none of these is one).
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
      filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'class'], 'railway']],
      layout: { 'text-field': '{name}' },
    },
    // Coloured's places by rank, as Liberty has them: shops, schools and train stations alike,
    // each by its icon and its name.
    {
      id: 'poi_r1',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'poi',
      filter: ['>=', ['get', 'rank'], 1],
      layout: { 'icon-image': '{class}', 'text-field': '{name}', 'text-size': 12 },
    },
    // A place layer in the legacy filter syntax, which an expression cannot join.
    {
      id: 'poi_legacy',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'poi',
      filter: ['==', 'class', 'shop'],
      layout: { 'icon-image': '{class}' },
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
    'poi_legacy',
  ]);
});

test('place icons: a poi layer with an icon, in a filter a station class can join', () => {
  const places = STYLE.layers.filter((l) => isPlaceIcons(l)).map((l) => l.id);
  assert.deepEqual(places, ['poi_transit', 'poi_r1'], 'not a name-only layer, nor a legacy one');
});

test('hidden, a place layer keeps its train stations alone, class railway, by their icon and no name', () => {
  const hidden = withLocationLabels(STYLE, false);
  const ranked = layer(hidden, 'poi_r1');
  assert.equal(ranked.layout.visibility, undefined, 'still drawn');
  assert.equal(ranked.layout['icon-image'], '{class}');
  assert.equal(ranked.layout['text-field'], undefined, 'no name');
  assert.equal(ranked.layout['text-size'], 12);
  // The station's class as the tiles have it, not "rail": the stations the ranked layer draws.
  assert.deepEqual(ranked.filter, [
    'all',
    ['>=', ['get', 'rank'], 1],
    ['==', ['get', 'class'], 'railway'],
  ]);
  assert.deepEqual(layer(hidden, 'poi_transit').filter, [
    'all',
    ['match', ['get', 'class'], ['airport', 'bus', 'rail'], true, false],
    ['==', ['get', 'class'], 'railway'],
  ]);
  assert.equal(layer(withLocationLabels(STYLE, true), 'poi_r1'), layer(STYLE, 'poi_r1'));
});

test('hidden, every basemap label is hidden and nothing else changes', () => {
  const hidden = withLocationLabels(STYLE, false);
  for (const id of [
    'highway_name',
    'highway_ref',
    'place_city',
    'detail-rail-stops',
    'poi_legacy',
  ]) {
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
