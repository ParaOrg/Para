// The Map Style card's Location Labels switch (src/features/routes/map/location-labels.ts): a
// basemap label is a symbol layer drawn from a source that is not GeoJSON, found by what it is and
// not by name; hiding them leaves Para's own labels alone, and showing them keeps the style's own.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/location-labels-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isBasemapLabel,
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
    { id: 'saved-hotspot-labels', type: 'symbol', source: 'saved-hotspots' },
    { id: 'recording-trail-feet', type: 'symbol', source: 'recording-trail' },
    { id: 'recording-trail-line', type: 'line', source: 'recording-trail' },
  ],
};

const layer = (style, id) => style.layers.find((l) => l.id === id);

test('a basemap label is a symbol layer from a source that is not GeoJSON', () => {
  const labels = STYLE.layers.filter((l) => isBasemapLabel(l, STYLE.sources)).map((l) => l.id);
  assert.deepEqual(labels, ['highway_name', 'highway_ref', 'place_city']);
});

test('hidden, every basemap label is hidden and nothing else changes', () => {
  const hidden = withLocationLabels(STYLE, false);
  for (const id of ['highway_name', 'highway_ref', 'place_city']) {
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

test('remembered only once shown: off leaves the storage empty, and anything else reads as off', () => {
  const stored = new Map();
  globalThis.localStorage = {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, String(value)),
    removeItem: (key) => stored.delete(key),
  };
  try {
    assert.equal(readLocationLabels(), false, 'off by default');
    rememberLocationLabels(true);
    assert.equal(readLocationLabels(), true);
    rememberLocationLabels(false);
    assert.equal(stored.size, 0, 'off is no entry at all');
    stored.set('para.location-labels.v1', 'yes');
    assert.equal(readLocationLabels(), false, 'anything but "shown" is off');
  } finally {
    delete globalThis.localStorage;
  }
});

test('storage that throws reads as off and remembers nothing, quietly', () => {
  globalThis.localStorage = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
    removeItem: () => {
      throw new Error('blocked');
    },
  };
  try {
    assert.equal(readLocationLabels(), false);
    assert.doesNotThrow(() => rememberLocationLabels(true));
  } finally {
    delete globalThis.localStorage;
  }
});
