// Closing the loop (src/features/studio/drawing/loop-closing.ts): where a return trip starts and
// ends, how far a drawn line is from joining, and the line of the route's other way.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/loop-closing-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { haversine } from '../../src/shared/utils/geo.ts';
import {
  LOOP_GAP_M,
  loopClosingPoint,
  loopGaps,
  loopNotices,
  outboundFeatures,
  outboundFor,
  returnTripNotices,
  returnTripStart,
  whyCannotCloseLoop,
} from '../../src/features/studio/drawing/loop-closing.ts';

/** A point `east` metres east and `north` metres north of Tala. */
const at = (east = 0, north = 0) => [121.04 + east / 107_500, 14.7 + north / 111_195];
const OUTBOUND = [at(0, 0), at(500, 0), at(500, 400), at(900, 400)];
const START = OUTBOUND[0];
const END = OUTBOUND[3];

test("a return trip starts on the outbound line's last point, and closes on its first", () => {
  assert.deepEqual(returnTripStart(OUTBOUND), END);
  assert.deepEqual(loopClosingPoint(OUTBOUND), START);
});

test('the points are copies: dragging the drawn point cannot move the saved line', () => {
  assert.notEqual(returnTripStart(OUTBOUND), OUTBOUND[3]);
  assert.notEqual(loopClosingPoint(OUTBOUND), OUTBOUND[0]);
});

test('a line with fewer than two points has no ends to join', () => {
  assert.equal(returnTripStart([]), null);
  assert.equal(loopClosingPoint([]), null);
  assert.equal(returnTripStart([START]), null);
  assert.equal(loopClosingPoint([START]), null);
  assert.deepEqual(loopGaps([START], [at(5)]), { startM: null, endM: null });
});

test('a return trip drawn from end to start has no gap at either end', () => {
  const drawn = [END, at(600, 800), START];
  const { startM, endM } = loopGaps(OUTBOUND, drawn);
  assert.equal(startM, 0);
  assert.equal(endM, 0);
  assert.deepEqual(loopNotices(OUTBOUND, drawn), []);
});

test('the gap is measured in metres from each end to where the loop joins', () => {
  const drawn = [at(900, 400 + 30), at(600, 800), at(0, 120)];
  const { startM, endM } = loopGaps(OUTBOUND, drawn);
  assert.ok(Math.abs(startM - 30) < 0.5, `${startM}`);
  assert.ok(Math.abs(endM - 120) < 0.5, `${endM}`);
  assert.ok(Math.abs(startM - haversine(drawn[0], END)) < 1e-9);
});

test('a return trip of one point has a start gap and no end gap', () => {
  const lone = [at(900, 400 + 60)];
  const { startM, endM } = loopGaps(OUTBOUND, lone);
  assert.ok(Math.abs(startM - 60) < 0.5);
  assert.equal(endM, null);
  assert.deepEqual(loopNotices(OUTBOUND, lone), [
    `The return trip starts ${Math.round(startM)} m from where papunta ended.`,
  ]);
  assert.deepEqual(loopGaps(OUTBOUND, []), { startM: null, endM: null });
});

test('a gap over 15 m is said, 15 m and under is not', () => {
  assert.equal(LOOP_GAP_M, 15);
  const far = (m) => [at(900, 400 + m), at(0, m)];
  assert.deepEqual(loopNotices(OUTBOUND, far(14.9)), []);
  assert.equal(loopNotices(OUTBOUND, far(15.1)).length, 2);
  // Exactly the limit is not over it (the metre figures are measured, so allow a hair).
  const exactly = [at(900, 400), at(0, 0)];
  assert.deepEqual(loopNotices(OUTBOUND, exactly), []);
});

test('the notice says which end, how far, and offers the loop', () => {
  const drawn = [END, at(300, 700), at(0, 120)];
  assert.deepEqual(loopNotices(OUTBOUND, drawn), [
    'The return trip ends 120 m from where papunta began. Close the loop?',
  ]);
});

test("drawn into papunta's slot (pabalik was drawn first) the notice names the ways the other round", () => {
  const drawn = [at(900, 400 + 50), at(0, 120)];
  assert.deepEqual(loopNotices(OUTBOUND, drawn, true), [
    'Papunta starts 50 m from where pabalik ended.',
    'Papunta ends 120 m from where pabalik began. Close the loop?',
  ]);
});

const hotspot = (id, point) => ({ id, point: { type: 'Point', coordinates: point } });
const HEAD = hotspot('head', START);
const TAIL = hotspot('tail', at(900, 400));
const row = (id, reversed, coordinates) => ({
  id,
  routeId: 'r1',
  reversed,
  shape: coordinates ? { type: 'LineString', coordinates } : null,
  route: { id: 'r1', headHotspotId: 'head', tailHotspotId: 'tail' },
});

test("the outbound is the route's drawn direction, never the empty slot", () => {
  const directions = [row('slot', true, null), row('out', false, OUTBOUND)];
  assert.deepEqual(outboundFor(directions, 'r1', [HEAD, TAIL]), OUTBOUND);
  assert.equal(outboundFor([row('slot', true, null)], 'r1', [HEAD, TAIL]), null);
  assert.equal(outboundFor(directions, 'other', [HEAD, TAIL]), null);
});

test('a line stored the other way round is read in travel order', () => {
  const stored = [...OUTBOUND].reverse();
  const line = outboundFor([row('out', false, stored)], 'r1', [HEAD, TAIL]);
  assert.deepEqual(line, OUTBOUND);
});

test("the save panel's notices need the route's other way, and name the slot's way", () => {
  const directions = [row('out', false, OUTBOUND), row('slot', true, null)];
  const open = [END, at(300, 700), at(0, 120)];
  assert.deepEqual(returnTripNotices(directions, 'r1', [HEAD, TAIL], open, true), [
    'The return trip ends 120 m from where papunta began. Close the loop?',
  ]);
  assert.deepEqual(returnTripNotices(directions, null, [HEAD, TAIL], open, true), []);
  assert.deepEqual(
    returnTripNotices([row('slot', true, null)], 'r1', [HEAD, TAIL], open, true),
    [],
  );
  // The slot that runs head to tail is papunta: it was pabalik that was drawn first.
  const first = [row('back', true, [END, at(300, 700), START]), row('slot', false, null)];
  assert.deepEqual(
    returnTripNotices(first, 'r1', [HEAD, TAIL], [START, at(500, 0), at(900, 460)], false),
    ['Papunta ends 60 m from where pabalik began. Close the loop?'],
  );
});

test('the faint outbound is its line with a ring at its start and a dot at its end', () => {
  const fc = outboundFeatures(OUTBOUND);
  assert.deepEqual(
    fc.features.map((f) => f.properties.role),
    ['line', 'start', 'end'],
  );
  assert.deepEqual(fc.features[0].geometry.coordinates, OUTBOUND);
  assert.deepEqual(fc.features[1].geometry.coordinates, START);
  assert.deepEqual(fc.features[2].geometry.coordinates, END);
  assert.deepEqual(outboundFeatures(null).features, []);
  assert.deepEqual(outboundFeatures([START]).features, []);
});

test('"Close the loop" says why not: no point yet, or the loop is already closed', () => {
  assert.equal(whyCannotCloseLoop([], START), 'add a point first');
  assert.equal(whyCannotCloseLoop([END, at(300, 700)], START), null);
  assert.equal(whyCannotCloseLoop([END, at(300, 700), START], START), 'the loop is closed');
  // Within a metre is closed; a few metres off is not.
  assert.equal(whyCannotCloseLoop([END, at(0.5, 0)], START), 'the loop is closed');
  assert.equal(whyCannotCloseLoop([END, at(3, 0)], START), null);
});
