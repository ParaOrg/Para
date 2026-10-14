// The saved toast's return-trip offer (src/features/studio/panels/return-trip.ts):
// offered while the route just saved still has a direction undrawn, and never
// for the direction just saved, whatever the list says before its reload.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/return-trip-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { returnTripLeft } from '../../src/features/studio/panels/return-trip.ts';

/** A direction row, shaped as the list loads them: sample data only. */
const direction = (id, routeId, shape = null) => ({ id, routeId, shape });
const LINE = { type: 'LineString', coordinates: [] };

test('nothing just saved: nothing offered', () => {
  assert.equal(returnTripLeft(null, [direction('out', 'r1'), direction('back', 'r1')]), false);
});

test("the route's other direction undrawn: the return trip is offered", () => {
  const saved = direction('out', 'r1', LINE);
  assert.equal(returnTripLeft(saved, [saved, direction('back', 'r1')]), true);
});

test('the other direction already drawn: nothing offered', () => {
  const saved = direction('out', 'r1', LINE);
  assert.equal(returnTripLeft(saved, [saved, direction('back', 'r1', LINE)]), false);
});

test('the list still shows the direction just saved as undrawn: it counts as drawn', () => {
  const saved = direction('out', 'r1', LINE);
  const stale = direction('out', 'r1');
  assert.equal(returnTripLeft(saved, [stale, direction('back', 'r1', LINE)]), false);
});

test("another route's empty slot is not this route's", () => {
  const saved = direction('out', 'r1', LINE);
  assert.equal(returnTripLeft(saved, [saved, direction('back', 'r2')]), false);
});
