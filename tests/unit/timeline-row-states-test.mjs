// Each stop's state on a trip's timeline (src/features/routes/cards/timeline-row-states.ts),
// Figma's RouteStopsTimeline (4611:10957): Rest on the rail with nothing picked; with a ride
// picked, its ends Selected or SelectedTop / SelectedBottom, the rows between Rest, the rows
// outside it Unselected (T4).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/timeline-row-states-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { timelineRowStates } from '../../src/features/routes/cards/timeline-row-states.ts';
import { rideRows } from '../../src/features/routes/model/ride-rows.ts';

const HINTUANS = ['a', 'b', 'c', 'd'].map((id) => ({ id }));

test('nothing picked: every stop on the rail', () => {
  assert.deepEqual(timelineRowStates(4, null), ['rest', 'rest', 'rest', 'rest', 'rest', 'rest']);
});

test('an end picked mid-way: from the origin to it, the rest standing alone', () => {
  const ride = rideRows(HINTUANS, null, 'b');
  assert.deepEqual(timelineRowStates(4, ride), [
    'selected',
    'rest',
    'selectedBottom',
    'unselected',
    'unselected',
    'unselected',
  ]);
});

test('a start and an end mid-way: Selected Top and Bottom, the ride between on the rail', () => {
  const ride = rideRows(HINTUANS, 'a', 'c');
  assert.deepEqual(timelineRowStates(4, ride), [
    'unselected',
    'selectedTop',
    'rest',
    'selectedBottom',
    'unselected',
    'unselected',
  ]);
});

test('a start, and the destination its end: Selected at the timeline’s end', () => {
  const ride = rideRows(HINTUANS, 'b', null, 'to');
  assert.deepEqual(timelineRowStates(4, ride), [
    'unselected',
    'unselected',
    'selectedTop',
    'rest',
    'rest',
    'selected',
  ]);
});

test('a start alone is no ride yet: every stop stands alone', () => {
  assert.deepEqual(timelineRowStates(4, { first: 1, last: 1 }, true), [
    'unselected',
    'unselected',
    'unselected',
    'unselected',
    'unselected',
    'unselected',
  ]);
});

test('a loop’s ride past the tip: from its start down, and on from the top to its end', () => {
  const ride = rideRows(HINTUANS, 'c', 'a', null, true);
  assert.deepEqual(timelineRowStates(4, ride), [
    'rest',
    'selectedBottom',
    'unselected',
    'selectedTop',
    'rest',
    'rest',
  ]);
});
