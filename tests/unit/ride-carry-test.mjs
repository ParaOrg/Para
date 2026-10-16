// SWITCH's carry-over on a jeep's trip (src/features/routes/model/ride-carry.ts,
// carryPicks): which picks the way back starts with, each landing where
// `land` puts its place. The hook around it, and the landing itself
// (boxTheOtherWay), are switch-pick-test's.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/ride-carry-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { carryPicks } from '../../src/features/routes/model/ride-carry.ts';

/** Every row lands on its twin the other way, `a` on `a'`. */
const twin = (rowId) => `${rowId}'`;
/** Nothing lands. */
const nowhere = () => null;
const picks = (over = {}) => ({ start: null, picked: null, endPicked: null, ...over });

test('nothing picked carries nothing', () => {
  assert.deepEqual(carryPicks(picks(), twin), picks());
});

test('a hintuan end lands on its place the other way; nowhere, the ride turns whole', () => {
  assert.deepEqual(carryPicks(picks({ picked: 'b' }), twin), picks({ picked: "b'" }));
  assert.deepEqual(carryPicks(picks({ picked: 'b' }), nowhere), picks());
});

test('an end row follows its place: the destination becomes the origin, and back', () => {
  assert.deepEqual(carryPicks(picks({ endPicked: 'to' }), twin), picks({ endPicked: 'from' }));
  assert.deepEqual(carryPicks(picks({ endPicked: 'from' }), twin), picks({ endPicked: 'to' }));
});

test('a start alone stays a start; nowhere to land, it is let go', () => {
  assert.deepEqual(carryPicks(picks({ start: 'a' }), twin), picks({ start: "a'" }));
  assert.deepEqual(carryPicks(picks({ start: 'a' }), nowhere), picks());
});

test('a start and a hintuan end swap: the ride back (the owner, 2026-10-16)', () => {
  assert.deepEqual(
    carryPicks(picks({ start: 'a', picked: 'b' }), twin),
    picks({ start: "b'", picked: "a'" }),
  );
});

test('a start and an end that land nowhere are let go, each alone', () => {
  const onlyA = (rowId) => (rowId === 'a' ? "a'" : null);
  assert.deepEqual(carryPicks(picks({ start: 'a', picked: 'b' }), onlyA), picks({ picked: "a'" }));
  const onlyB = (rowId) => (rowId === 'b' ? "b'" : null);
  assert.deepEqual(carryPicks(picks({ start: 'a', picked: 'b' }), onlyB), picks({ start: "b'" }));
});

test('a start with the destination as the end: the way back leaves from there to the start', () => {
  assert.deepEqual(
    carryPicks(picks({ start: 'a', endPicked: 'to' }), twin),
    picks({ picked: "a'" }),
  );
  assert.deepEqual(carryPicks(picks({ start: 'a', endPicked: 'to' }), nowhere), picks());
});

test("a start ridden back to the origin stays the start, the way back's destination its end (Claude's call)", () => {
  assert.deepEqual(
    carryPicks(picks({ start: 'a', endPicked: 'from' }), twin),
    picks({ start: "a'", endPicked: 'to' }),
  );
  assert.deepEqual(
    carryPicks(picks({ start: 'a', endPicked: 'from' }), nowhere),
    picks({ endPicked: 'to' }),
  );
});
