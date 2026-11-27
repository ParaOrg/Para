// The route line detail's tabs (src/features/studio/panels/direction-tabs.ts): each direction
// named by its bound, "To <destination>" when both share one, and none for a loop.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/direction-tabs-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boundOf, directionTabs } from '../../src/features/studio/panels/direction-tabs.ts';

const way = (id, reversed, coordinates, { isLoop = false, routeId = 'r1' } = {}) => ({
  id,
  routeId,
  reversed,
  name: reversed ? 'SM Fairview → Tala' : 'Tala → SM Fairview',
  shape: coordinates.length ? { type: 'LineString', coordinates } : null,
  route: { isLoop },
});

test('a line is named by the way it moves furthest, start to end', () => {
  assert.equal(
    boundOf([
      [121.0, 14.6],
      [121.01, 14.7],
    ]),
    'Northbound',
  );
  assert.equal(
    boundOf([
      [121.0, 14.7],
      [121.01, 14.6],
    ]),
    'Southbound',
  );
  assert.equal(
    boundOf([
      [121.0, 14.6],
      [121.1, 14.61],
    ]),
    'Eastbound',
  );
  assert.equal(
    boundOf([
      [121.1, 14.6],
      [121.0, 14.61],
    ]),
    'Westbound',
  );
  assert.equal(boundOf([[121.0, 14.6]]), null);
  assert.equal(
    boundOf([
      [121.0, 14.6],
      [121.0, 14.6],
    ]),
    null,
  );
});

test('two drawn ways, the way there first, each by its bound', () => {
  const there = way('a', false, [
    [121.0, 14.6],
    [121.0, 14.7],
  ]);
  const back = way('b', true, [
    [121.0, 14.7],
    [121.0, 14.6],
  ]);
  const tabs = directionTabs(back, [
    back,
    there,
    way(
      'x',
      false,
      [
        [0, 0],
        [1, 1],
      ],
      { routeId: 'r2' },
    ),
  ]);
  assert.deepEqual(
    tabs.map((t) => [t.direction.id, t.label, t.isDrawn]),
    [
      ['a', 'Northbound', true],
      ['b', 'Southbound', true],
    ],
  );
});

test('both ways the same bound: each is named for where it goes', () => {
  // A route that goes up one road and comes back up another, ending north of where it began.
  const there = way('a', false, [
    [121.0, 14.6],
    [121.0, 14.7],
  ]);
  const back = way('b', true, [
    [121.1, 14.6],
    [121.1, 14.7],
  ]);
  assert.deepEqual(
    directionTabs(there, [there, back]).map((t) => t.label),
    ['To SM Fairview', 'To Tala'],
  );
});

test('the way back not drawn yet: a tab for it all the same, the drawn one by its bound', () => {
  const there = way('a', false, [
    [121.0, 14.6],
    [121.1, 14.6],
  ]);
  const back = way('b', true, []);
  assert.deepEqual(
    directionTabs(there, [there, back]).map((t) => [t.label, t.isDrawn]),
    [
      ['Eastbound', true],
      ['To Tala', false],
    ],
  );
});

test('a loop has no tabs', () => {
  const loop = way(
    'a',
    false,
    [
      [121.0, 14.6],
      [121.1, 14.6],
      [121.0, 14.6],
    ],
    { isLoop: true },
  );
  assert.deepEqual(directionTabs(loop, [loop]), []);
});
