import assert from 'node:assert/strict';
import { test } from 'node:test';

import { reviewSummary } from '../../src/features/studio/data/review-summary.ts';

const LINE = {
  type: 'LineString',
  coordinates: [
    [121.05, 14.71],
    [121.06, 14.7],
  ],
};
const ROUTE = { signboard: 'Fairview – Capitol', mode: 'jeepney', via: null, is_loop: false };
const way = (id, reversed, isDrawn, extra = {}) => ({
  id,
  reversed,
  shape: isDrawn ? LINE : null,
  control_points: isDrawn ? LINE.coordinates : [],
  segments: [],
  links: isDrawn ? [{ stop_id: 'h', stop_sequence: 1 }] : [],
  signboards: isDrawn ? ['board.svg'] : [],
  ...extra,
});
const route = (directions, facts = {}) => ({
  version: 1,
  route: { ...ROUTE, ...facts },
  directions,
});
const comparison = (approved, proposed) => ({
  approved,
  proposed,
  currentRevision: 3,
  hasConflict: false,
  dependencies: [],
});

test('a delete on one way says which line it removes, and nothing about its boards', () => {
  assert.deepEqual(
    reviewSummary(
      comparison(
        route([way('a', false, true), way('b', true, true)]),
        route([way('a', false, true), way('b', true, false)]),
      ),
    ),
    ['Removes the Pabalik line'],
  );
});

test('a way drawn into an empty slot is a line drawn', () => {
  assert.deepEqual(
    reviewSummary(
      comparison(
        route([way('a', false, true), way('b', true, false)]),
        route([way('a', false, true), way('b', true, true)]),
      ),
    ),
    ['Draws the Pabalik line'],
  );
});

test('a moved line is redrawn, and a changed fare note besides is named', () => {
  const moved = way('a', false, true, {
    shape: {
      type: 'LineString',
      coordinates: [
        [121.05, 14.71],
        [121.07, 14.7],
      ],
    },
  });
  assert.deepEqual(
    reviewSummary(
      comparison(
        route([way('a', false, true), way('b', true, true)]),
        route([moved, way('b', true, true)], { fare_note: '₱13' }),
      ),
    ),
    ['Redraws the Papunta line', 'Changes the route’s details'],
  );
});

test('every way emptied takes the whole route down', () => {
  assert.deepEqual(
    reviewSummary(
      comparison(
        route([way('a', false, true), way('b', true, true)]),
        route([way('a', false, false), way('b', true, false)]),
      ),
    ),
    ['Removes the whole route: no way has a line left'],
  );
});

test('a new route says so, with the lines it draws; a loop names its ikot line', () => {
  assert.deepEqual(
    reviewSummary(comparison(null, route([way('a', false, true), way('b', true, false)]))),
    ['Adds this route', 'Draws the Papunta line'],
  );
  assert.deepEqual(
    reviewSummary(comparison(null, route([way('a', false, true)], { is_loop: true }))),
    ['Adds this route', 'Draws the ikot line'],
  );
});

test('only details changed, or nothing at all, is said plainly', () => {
  const ways = [way('a', false, true), way('b', true, true)];
  assert.deepEqual(reviewSummary(comparison(route(ways), route(ways, { fare_note: '₱13' }))), [
    'Changes the route’s details',
  ]);
  assert.deepEqual(reviewSummary(comparison(route(ways), route(ways))), [
    'Changes nothing: it matches the approved route',
  ]);
});

test('a place is added or changed', () => {
  const place = { version: 1, stop: { name: 'Palma Hall' }, links: [] };
  assert.deepEqual(reviewSummary(comparison(null, place)), ['Adds this place']);
  assert.deepEqual(
    reviewSummary(comparison(place, { ...place, stop: { name: 'Palma Hall East' } })),
    ['Changes this place'],
  );
});
