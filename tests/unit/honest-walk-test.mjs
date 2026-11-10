// Go here's honest walking (src/features/routes/model/honest-walk.ts, .scratch/go-here ticket 05):
// a straight walk's words, rounded so "about" is honest, and the link that hands the walk to the
// phone's own maps app, never Google's.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/honest-walk-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  mapsLink,
  mapsPlatformOf,
  roundedWalkM,
  walkWords,
} from '../../src/features/routes/model/honest-walk.ts';
import { walkToLandmark } from '../../src/features/routes/model/landmark-search.ts';

test('a walk is rounded to 10 m, never under 10, and said as a straight line', () => {
  assert.equal(roundedWalkM(296), 300);
  assert.equal(roundedWalkM(3), 10);
  assert.equal(walkWords(296), 'About 300 m in a straight line');
  // Place search's landmark walk rounds the same way.
  assert.equal(walkToLandmark(296, 'X'), 'About 300 m to X, in a straight line');
});

const FROM = [121.0347, 14.6537];
const TO = [121.0331, 14.6561];

test("Android gets a geo: link to the destination, so the commuter's own app plans it", () => {
  assert.equal(
    mapsLink(FROM, TO, 'SM North EDSA', 'android'),
    'geo:14.656100,121.033100?q=14.656100,121.033100(SM%20North%20EDSA)',
  );
});

test('an iPhone gets Apple Maps walking directions between the two points', () => {
  assert.equal(
    mapsLink(FROM, TO, 'SM North EDSA', 'apple'),
    'maps://?saddr=14.653700,121.034700&daddr=14.656100,121.033100&dirflg=w',
  );
});

test("a computer gets openstreetmap.org's walking directions, and no link is Google's", () => {
  const web = mapsLink(FROM, TO, 'SM North EDSA', 'web');
  assert.equal(
    web,
    'https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=14.653700%2C121.034700%3B14.656100%2C121.033100',
  );
  for (const platform of ['android', 'apple', 'web']) {
    assert.doesNotMatch(mapsLink(FROM, TO, 'x', platform), /google/i);
  }
});

test('the platform is read from the user agent', () => {
  assert.equal(mapsPlatformOf('Mozilla/5.0 (Linux; Android 14; Pixel 8)'), 'android');
  assert.equal(mapsPlatformOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'), 'apple');
  assert.equal(mapsPlatformOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'web');
});
