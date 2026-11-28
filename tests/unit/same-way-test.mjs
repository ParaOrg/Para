// A line picked for a route's empty slot, against the route's drawn direction
// (src/features/studio/drawing/same-way.ts, src/features/studio/panels/return-trip-notes.ts), and
// "+ Add route"'s menu (src/features/studio/panels/add-way.ts).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/same-way-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { runsSameWay } from '../../src/features/studio/drawing/same-way.ts';
import { sameWayNotice } from '../../src/features/studio/panels/return-trip-notes.ts';
import { ADD_WAY_CHOICES, addWayOf } from '../../src/features/studio/panels/add-way.ts';

/** A point `east` metres east and `north` metres north of Tala. */
const at = (east = 0, north = 0) => [121.04 + east / 107_500, 14.7 + north / 111_195];
const DRAWN = [at(0, 0), at(500, 0), at(900, 400)];

test("a line from the drawn way's start to its end runs the same way; one back does not", () => {
  assert.equal(runsSameWay([at(10, 5), at(450, -300), at(880, 390)], DRAWN), true);
  assert.equal(runsSameWay([at(880, 390), at(450, -300), at(10, 5)], DRAWN), false);
});

test('ends that do not read plainly one way round are not said to', () => {
  // Both ends near the middle of the drawn way: nearer neither end.
  assert.equal(runsSameWay([at(450, 200), at(460, 210)], DRAWN), false);
  // A route whose two ends are close together (out and back to near the same place).
  const nearlyRound = [at(0, 0), at(800, 600), at(30, 0)];
  assert.equal(runsSameWay([at(5, 0), at(400, 900), at(25, 0)], nearlyRound), false);
});

test("a line from the drawn way's start to its middle is plainly the same way; to its end back, not", () => {
  assert.equal(runsSameWay([at(0, 10), at(500, 10)], DRAWN), true);
  assert.equal(runsSameWay([at(500, 10), at(0, 10)], DRAWN), false);
});

test('fewer than two points on either has nothing to compare', () => {
  assert.equal(runsSameWay([at(0, 0)], DRAWN), false);
  assert.equal(runsSameWay(DRAWN, [at(0, 0)]), false);
});

const hotspot = (id, point) => ({ id, point: { type: 'Point', coordinates: point } });
const HOTSPOTS = [hotspot('head', DRAWN[0]), hotspot('tail', DRAWN[2])];
const row = (id, reversed, coordinates) => ({
  id,
  routeId: 'r1',
  reversed,
  shape: coordinates ? { type: 'LineString', coordinates } : null,
  route: { id: 'r1', headHotspotId: 'head', tailHotspotId: 'tail' },
});
const DIRECTIONS = [row('out', false, DRAWN), row('slot', true, null)];

test('the notice names the drawn way by its tab, and says nothing for a line the right way round', () => {
  assert.equal(
    sameWayNotice(DIRECTIONS, 'r1', HOTSPOTS, [at(10, 5), at(880, 390)]),
    'This line runs the same way as Eastbound, and the empty slot is for the other way. Check it, or redraw it from its other end, before you save.',
  );
  assert.equal(sameWayNotice(DIRECTIONS, 'r1', HOTSPOTS, [at(880, 390), at(10, 5)]), null);
  assert.equal(sameWayNotice([row('slot', true, null)], 'r1', HOTSPOTS, DRAWN), null);
});

test('a drawn way stored the other way round is compared in travel order', () => {
  // Pabalik drawn, stored tail to head: it travels from tail (900, 400) back to head (0, 0).
  const back = [row('back', true, [...DRAWN].reverse()), row('slot', false, null)];
  const fromTail = [at(880, 390), at(10, 5)];
  assert.match(sameWayNotice(back, 'r1', HOTSPOTS, fromTail) ?? '', /runs the same way as/);
  assert.equal(sameWayNotice(back, 'r1', HOTSPOTS, [...fromTail].reverse()), null);
});

test('"+ Add route" offers drawing first, then the two pickers, and reads its ids back', () => {
  assert.deepEqual(
    ADD_WAY_CHOICES.map((choice) => choice.label),
    ['Draw it', 'Start from an OSM route', 'Start from an old Para route'],
  );
  assert.equal(addWayOf('osm'), 'osm');
  assert.equal(addWayOf('old-para'), 'old-para');
  assert.equal(addWayOf('delete'), null);
});
