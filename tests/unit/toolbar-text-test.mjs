// What the studio's drawing toolbar says (src/features/studio/drawing/toolbar-text.ts):
// the length, Extend's keep buttons in the jeep's order, why Done waits, the
// U-turn warning, the hint over the bar, and keys typed into a field.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/toolbar-text-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  drawHint,
  formatDistance,
  isTyping,
  keepOptions,
  uTurnWarning,
  whyNotDone,
} from '../../src/features/studio/drawing/toolbar-text.ts';

test('the length: whole metres under a kilometre, km to two places from there', () => {
  assert.equal(formatDistance(0), '0 m');
  assert.equal(formatDistance(999.4), '999 m');
  assert.equal(formatDistance(1000), '1.00 km');
  assert.equal(formatDistance(12345), '12.35 km');
});

test("Extend's keep buttons speak in travel order; a backwards line swaps the parts they keep", () => {
  const ends = { from: 'Tala', to: 'SM Fairview', backwards: false };
  assert.deepEqual(keepOptions(ends), [
    { part: 'start', label: 'Keep Tala → here', hint: 'the new route carries on from here' },
    { part: 'end', label: 'Keep here → SM Fairview', hint: 'the new route joins here' },
  ]);
  assert.deepEqual(
    keepOptions({ ...ends, backwards: true }).map((o) => [o.label, o.part]),
    [
      ['Keep Tala → here', 'end'],
      ['Keep here → SM Fairview', 'start'],
    ],
  );
  assert.deepEqual(
    keepOptions(null).map((o) => o.label),
    ['Keep the start → here', 'Keep here → the end'],
  );
});

test('Done waits for enough points, then for the router', () => {
  assert.equal(whyNotDone(1, 2, 'point', false), 'Add at least 2 points');
  assert.equal(whyNotDone(2, 3, 'corner', true), 'Add at least 3 corners');
  assert.equal(whyNotDone(2, 2, 'point', true), 'Waiting for the router');
  assert.equal(whyNotDone(2, 2, 'point', false), null);
});

test('the U-turn warning, for one ringed point or several', () => {
  assert.match(uTurnWarning(1), /at the ringed point,/);
  assert.match(uTurnWarning(2), /at the ringed points,/);
});

test('the hint: the warning asked for first; a finger told what it does; a mouse once there is a point', () => {
  const base = { uTurnHelp: null, isFinger: false, isArea: false, points: 0 };
  assert.equal(drawHint({ ...base, uTurnHelp: 'Careful', isFinger: true }), 'Careful');
  assert.equal(drawHint({ ...base, isFinger: true }), 'Tap where the jeep starts');
  assert.match(drawHint({ ...base, isFinger: true, points: 2 }), /^Tap to add · tap a point/);
  assert.equal(
    drawHint({ ...base, isFinger: true, isArea: true }),
    'Tap the corners of the hotspot',
  );
  assert.match(
    drawHint({ ...base, isFinger: true, isArea: true, points: 1 }),
    /^Tap to add a corner/,
  );
  assert.equal(drawHint(base), null);
  assert.match(drawHint({ ...base, points: 1 }), /shift-click a stretch to straighten it/);
  assert.match(drawHint({ ...base, isArea: true, points: 1 }), /click an edge to insert a corner/);
});

test('the hint on a return trip names the way already drawn, until there are two points', () => {
  const base = { uTurnHelp: null, isFinger: false, isArea: false, points: 0, loopOther: 'papunta' };
  assert.match(drawHint(base), /^Tap the dot where papunta ended/);
  assert.match(drawHint({ ...base, points: 1 }), /starts where papunta ended \(the dot\)/);
  assert.match(drawHint({ ...base, points: 1 }), /began \(the ring\)/);
  // From two points on it is the ordinary hint again; a hotspot's outline is not a return trip.
  assert.match(drawHint({ ...base, points: 2 }), /drag a point to move/);
  assert.equal(drawHint({ ...base, isArea: true }), null);
  assert.equal(drawHint({ ...base, loopOther: null }), null);
});

test('a key typed into a field is the field’s', () => {
  assert.equal(isTyping(null), false);
  assert.equal(isTyping({ tagName: 'INPUT', isContentEditable: false }), true);
  assert.equal(isTyping({ tagName: 'TEXTAREA', isContentEditable: false }), true);
  assert.equal(isTyping({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isTyping({ tagName: 'BUTTON', isContentEditable: false }), false);
});
