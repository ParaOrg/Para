// The basemap files the offline worker warms on a first visit (pwa.ts,
// warmCaches), read off the style with a schema: each source's TileJSON and
// the sprite, whether the style names one sprite or a list of them.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs --test tests/unit/style-files-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { styleFiles } from '../../src/features/published-map/style-files.ts';

const OFM = 'https://tiles.openfreemap.org';

test("a style's TileJSON and its sprite at the screen's scale", () => {
  const style = {
    version: 8,
    sprite: `${OFM}/sprites/ofm_f384/ofm`,
    sources: {
      openmaptiles: { type: 'vector', url: `${OFM}/planet` },
      ne2_shaded: { type: 'raster', tiles: [`${OFM}/natural_earth/{z}/{x}/{y}.png`] },
    },
    layers: [],
  };
  assert.deepEqual(styleFiles(style, '@2x'), [
    `${OFM}/planet`,
    `${OFM}/sprites/ofm_f384/ofm@2x.json`,
    `${OFM}/sprites/ofm_f384/ofm@2x.png`,
  ]);
  assert.deepEqual(styleFiles(style, '').slice(1), [
    `${OFM}/sprites/ofm_f384/ofm.json`,
    `${OFM}/sprites/ofm_f384/ofm.png`,
  ]);
});

test('a list of sprites is each sprite, never "[object Object]"', () => {
  const style = {
    sprite: [
      { id: 'default', url: 'https://a.example/sprite' },
      { id: 'extra', url: 'https://b.example/more' },
    ],
  };
  const files = styleFiles(style, '');
  assert.deepEqual(files, [
    'https://a.example/sprite.json',
    'https://a.example/sprite.png',
    'https://b.example/more.json',
    'https://b.example/more.png',
  ]);
  assert.ok(!files.some((url) => url.includes('[object')));
});

test('anything that does not read as a style warms nothing', () => {
  for (const bad of [null, undefined, 'style', 42, { sprite: 7 }, { sources: { a: { url: 3 } } }]) {
    assert.deepEqual(styleFiles(bad, ''), [], JSON.stringify(bad));
  }
  assert.deepEqual(styleFiles({}, ''), []);
});
