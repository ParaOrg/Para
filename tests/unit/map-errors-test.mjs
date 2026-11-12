// What an error on the map means (src/features/routes/map/map-errors.ts): a basemap tile, glyph
// or sprite that did not come once the map is up or its routes are drawn, which only the console
// hears; the opening's fallback before that; the map failing otherwise. And who is shown the
// failure box's diagnostics: the studio alone.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/map-errors-test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { watchMapErrors } from '../../src/features/routes/map/map-errors.ts';

/** A stand-in for the map, its 'error' fired by hand, and what was done with each. */
const watched = (t, over = {}) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const error = t.mock.method(console, 'error', () => {});
  const failures = [];
  const askedToFallBack = [];
  let fire = () => {};
  watchMapErrors(
    {
      on(type, listener) {
        assert.equal(type, 'error');
        fire = listener;
      },
    },
    {
      isLoaded: () => false,
      areRoutesDrawn: () => false,
      fallBack: (message) => {
        askedToFallBack.push(message);
        return false;
      },
      onFailure: (message) => failures.push(message),
      ...over,
    },
  );
  return { fire, failures, askedToFallBack, warn, error };
};
const tile = { error: new Error('Failed to fetch (0): https://tiles.example/14/13712/7566.pbf') };

test('a late tile with the routes drawn raises nothing: the console hears it, the box stays away', (t) => {
  const map = watched(t, { areRoutesDrawn: () => true });
  map.fire(tile);
  assert.deepEqual(map.failures, []);
  assert.deepEqual(map.askedToFallBack, [], 'a style has come by then: nothing to fall back from');
  assert.equal(map.warn.mock.callCount(), 1);
  assert.equal(map.error.mock.callCount(), 0);
});

test("once the map has had its 'load', an error is a tile's too", (t) => {
  const map = watched(t, { isLoaded: () => true });
  map.fire(tile);
  assert.deepEqual(map.failures, []);
  assert.deepEqual(map.askedToFallBack, []);
  assert.equal(map.warn.mock.callCount(), 1);
});

test('before the routes are drawn, the opening may take the error on and fall back', (t) => {
  const map = watched(t, { fallBack: () => true });
  map.fire({ error: new Error('Failed to fetch') });
  assert.deepEqual(map.failures, []);
  assert.equal(map.error.mock.callCount(), 0);
});

test('before the routes are drawn and with nowhere to fall back, the map failed, and says what', (t) => {
  const map = watched(t);
  map.fire({ error: new Error('Failed to fetch') });
  assert.deepEqual(map.askedToFallBack, ['Failed to fetch']);
  assert.deepEqual(map.failures, ['Failed to fetch']);
  assert.equal(map.error.mock.callCount(), 1);

  map.fire({});
  assert.deepEqual(map.failures, ['Failed to fetch', 'unknown map error']);
});

// ------------------------------------------------------------- who sees the diagnostics
const source = (path) => readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8');
/** The props a file hands its one <MapView>. */
const mapViewProps = (path) => {
  const text = source(path);
  const tags = [...text.matchAll(/<MapView\b[\s\S]*?\n\s*\/?>/g)];
  assert.equal(tags.length, 1, `${path} draws one MapView`);
  return tags[0][0];
};

test("the studio's map shows the failure box with every diagnostic; the public map's and the contributor page's do not", () => {
  assert.match(mapViewProps('app/studio/workshop.tsx'), /^\s*showsDiagnostics$/m);
  for (const path of [
    'app/public-map/public-map-app.tsx',
    'features/contribute/map/contribute-map.tsx',
  ]) {
    assert.doesNotMatch(mapViewProps(path), /showsDiagnostics/, path);
  }
  // Off unless a page asks, and MapView hands the box what it was told.
  const mapView = source('features/routes/map/map-view.tsx');
  assert.match(mapView, /showsDiagnostics = false,/);
  assert.match(mapView, /showsDiagnostics=\{showsDiagnostics\}/);
  // The routes' own test decides a late tile, the one "Loading map…" lifts on.
  assert.match(mapView, /areRoutesDrawn: \(\) => routesDrawn\(made\)/);
});
