// Where a map design is read from once Para's own basemap host has failed
// (src/features/routes/map/basemap-failover.ts): OpenFreeMap's style of the same design, set
// once, at the opening only.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/basemap-failover-test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fallbackStyleUrl,
  openingFallback,
} from '../../src/features/routes/map/basemap-failover.ts';
import { OPENFREEMAP_HOST } from '../../src/shared/config/basemap-host.ts';

const OWN = 'https://tiles.para-commute.org';

test('each design falls back to the same design on OpenFreeMap', () => {
  for (const name of ['positron', 'liberty', 'fiord'])
    assert.equal(
      fallbackStyleUrl(OWN, `${OWN}/styles/${name}`),
      `https://tiles.openfreemap.org/styles/${name}`,
    );
});

test('with OpenFreeMap as the host there is nowhere else to go', () => {
  assert.equal(fallbackStyleUrl(OPENFREEMAP_HOST, `${OPENFREEMAP_HOST}/styles/positron`), null);
});

test('only a style of the configured host falls back: never a tile, a sprite or another address', () => {
  for (const failed of [
    `${OWN}/14/13698/7520.pbf`,
    `${OWN}/sprites/ofm_f384/ofm.json`,
    `${OWN}/styles/`,
    `${OWN}/styles/positron/extra`,
    'https://example.org/styles/positron',
    `${OWN}.evil.example/styles/positron`,
    '',
  ])
    assert.equal(fallbackStyleUrl(OWN, failed), null, failed);
});

test('a style asked for with a query still falls back', () => {
  assert.equal(
    fallbackStyleUrl(OWN, `${OWN}/styles/liberty?v=2`),
    'https://tiles.openfreemap.org/styles/liberty',
  );
});

// ------------------------------------------------------------- the opening's fallback
/** A stand-in for the map: what was set on it, and its 'style.load' to fire by hand. */
const standIn = () => {
  const set = [];
  let loaded = () => {};
  return {
    set,
    styleLoads: () => loaded(),
    once(type, listener) {
      assert.equal(type, 'style.load');
      loaded = listener;
    },
    setStyle(style, options) {
      set.push({ style, options });
    },
  };
};
const opening = (map, over = {}) =>
  openingFallback(map, {
    host: OWN,
    styleUrl: `${OWN}/styles/positron`,
    makeStyle: async (url) => ({ from: url }),
    isGone: () => false,
    ...over,
  });
/** The fallback's style is made in a promise: wait for it to be set. */
const settled = () => new Promise((resolve) => setImmediate(resolve));

test('an error before any style has come sets the same design from OpenFreeMap, whole, and says so once', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const map = standIn();
  const fallBack = opening(map);
  assert.equal(fallBack('HTTP 503'), true, 'the error is taken on');
  await settled();
  assert.deepEqual(map.set, [
    { style: { from: 'https://tiles.openfreemap.org/styles/positron' }, options: { diff: false } },
  ]);
  assert.equal(warn.mock.callCount(), 1);
});

test('it never loops: a second error, the fallback failing too, is not taken on', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const map = standIn();
  const fallBack = opening(map);
  assert.equal(fallBack('HTTP 503'), true);
  assert.equal(fallBack('Failed to fetch'), false);
  await settled();
  assert.equal(map.set.length, 1);
});

test("once a style has come, an error is a tile's: nothing falls back", async () => {
  const map = standIn();
  const fallBack = opening(map);
  map.styleLoads();
  assert.equal(fallBack('a tile did not come'), false);
  await settled();
  assert.deepEqual(map.set, []);
});

test("with OpenFreeMap as the host, an error is the map's to say", () => {
  const map = standIn();
  const fallBack = opening(map, {
    host: OPENFREEMAP_HOST,
    styleUrl: `${OPENFREEMAP_HOST}/styles/positron`,
  });
  assert.equal(fallBack('HTTP 503'), false);
});

test("a map gone before the fallback's style is made is left alone", async (t) => {
  t.mock.method(console, 'warn', () => {});
  const map = standIn();
  const fallBack = opening(map, { isGone: () => true });
  assert.equal(fallBack('HTTP 503'), true);
  await settled();
  assert.deepEqual(map.set, []);
});
