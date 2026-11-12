// The map's credits name the host its style is drawn from
// (src/features/routes/map/basemap-host-drawing.ts): Para's own as configured, and OpenFreeMap
// once the opening fell back to it (basemap-failover.ts), in the map's corner and in the Map Data
// Source sheet alike.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/basemap-host-drawing-test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { openingFallback } from '../../src/features/routes/map/basemap-failover.ts';
import {
  followHostDrawing,
  hostDrawing,
  hostDrawingNow,
} from '../../src/features/routes/map/basemap-host-drawing.ts';
import { mapAttribution, mapCredits } from '../../src/features/routes/map/map-attribution.ts';
import { OPENFREEMAP_HOST } from '../../src/shared/config/basemap-host.ts';

const OWN = 'https://tiles.para-commute.org';
const glyphsOf = (host) => `${host}/fonts/{fontstack}/{range}.pbf`;

test("a style is drawn from OpenFreeMap when its glyphs are OpenFreeMap's, from the configured host otherwise", () => {
  assert.equal(hostDrawing(glyphsOf(OPENFREEMAP_HOST), OWN), OPENFREEMAP_HOST);
  assert.equal(hostDrawing(glyphsOf(OWN), OWN), OWN);
  assert.equal(hostDrawing(glyphsOf(OPENFREEMAP_HOST), OPENFREEMAP_HOST), OPENFREEMAP_HOST);
  // A style with no glyphs, or the contributor app's copies on the phone: as configured.
  assert.equal(hostDrawing(null, OWN), OWN);
  assert.equal(hostDrawing('/basemap/fonts/{fontstack}/{range}.pbf', OWN), OWN);
  // Another host whose name only starts the same is not OpenFreeMap.
  assert.equal(hostDrawing(`${OPENFREEMAP_HOST}.example/fonts/{range}.pbf`, OWN), OWN);
});

/** A stand-in for the map: its style's glyphs, set by hand or by setStyle, and its 'styledata'. */
const standIn = () => {
  const listeners = [];
  let glyphs = null;
  let styleLoads = () => {};
  return {
    on(type, listener) {
      assert.equal(type, 'styledata');
      listeners.push(listener);
    },
    once(type, listener) {
      assert.equal(type, 'style.load');
      styleLoads = listener;
    },
    getGlyphs: () => glyphs,
    /** A style arrives: its glyphs, then the map's 'styledata'. */
    styled(next) {
      glyphs = next;
      for (const listener of listeners) listener();
    },
    setStyle(style) {
      styleLoads();
      this.styled(style.glyphs);
    },
  };
};

test('the credits are told each time the host drawing is another, and not while it stays', () => {
  const map = standIn();
  const told = [];
  followHostDrawing(map, OWN, (host) => told.push(host));
  assert.equal(hostDrawingNow(OWN), OWN);

  map.styled(glyphsOf(OWN));
  map.styled(glyphsOf(OWN));
  assert.deepEqual(told, [], 'the configured host drawing is what the credits already say');

  map.styled(glyphsOf(OPENFREEMAP_HOST));
  map.styled(glyphsOf(OPENFREEMAP_HOST));
  assert.deepEqual(told, [OPENFREEMAP_HOST]);
  assert.equal(hostDrawingNow(OWN), OPENFREEMAP_HOST);

  // A design switched later, read from Para's own host again.
  map.styled(glyphsOf(OWN));
  assert.deepEqual(told, [OPENFREEMAP_HOST, OWN]);
  assert.equal(hostDrawingNow(OWN), OWN);
});

test('a map made anew starts from the configured host, whatever the last one drew from', () => {
  const first = standIn();
  followHostDrawing(first, OWN, () => {});
  first.styled(glyphsOf(OPENFREEMAP_HOST));
  assert.equal(hostDrawingNow(OWN), OPENFREEMAP_HOST);

  followHostDrawing(standIn(), OWN, () => {});
  assert.equal(hostDrawingNow(OWN), OWN);
});

test("the opening falls back: OpenFreeMap is credited, in the map's corner and in the sheet's rows", async (t) => {
  t.mock.method(console, 'warn', () => {});
  const map = standIn();
  let corner = mapAttribution(OWN);
  followHostDrawing(map, OWN, (host) => {
    corner = mapAttribution(host);
  });
  assert.match(corner, />© OpenMapTiles</);
  assert.doesNotMatch(corner, /OpenFreeMap/);

  const fallBack = openingFallback(map, {
    host: OWN,
    styleUrl: `${OWN}/styles/positron`,
    makeStyle: async (url) => ({ glyphs: glyphsOf(new URL(url).origin) }),
    isGone: () => false,
  });
  assert.equal(fallBack('Failed to fetch'), true);
  await new Promise((resolve) => setImmediate(resolve));

  assert.match(corner, /<a href="https:\/\/openfreemap\.org"[^>]*>OpenFreeMap<\/a>/);
  assert.doesNotMatch(corner, /OpenMapTiles/);
  const [, , tiles] = mapCredits(hostDrawingNow(OWN));
  assert.deepEqual([tiles.title, tiles.href], ['OpenFreeMap', 'https://openfreemap.org']);
});
