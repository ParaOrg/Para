// How a RouteCard orders its mode groups (src/features/routes/cards/route-modes.ts):
// road modes first in the order they appear, then Train, then Ferry.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/route-modes-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupByMode } from '../../src/features/routes/cards/route-modes.ts';

const row = (id, vehicle) => ({ id, vehicle });
const shape = (groups) => groups.map((g) => g.items.map((i) => i.id));

test('road groups keep the order they first appear in', () => {
  const groups = groupByMode([row('a', 'Bus'), row('b', 'Jeepney'), row('c', 'Bus')]);
  assert.deepEqual(shape(groups), [['a', 'c'], ['b']]);
});

test('a train row that comes first in the data closes the card', () => {
  const groups = groupByMode([row('a', 'LRT-1'), row('b', 'Jeepney'), row('c', 'Bus')]);
  assert.deepEqual(shape(groups), [['b'], ['c'], ['a']]);
});

test('the three train lines share one Train group, rows in their order', () => {
  const groups = groupByMode([
    row('a', 'MRT-3'),
    row('b', 'Jeepney'),
    row('c', 'LRT-1'),
    row('d', 'LRT-2'),
  ]);
  assert.deepEqual(shape(groups), [['b'], ['a', 'c', 'd']]);
});

test('the ferry comes after the train, whatever the data says', () => {
  const groups = groupByMode([row('a', 'Ferry'), row('b', 'LRT-2'), row('c', 'E-Jeep')]);
  assert.deepEqual(shape(groups), [['c'], ['b'], ['a']]);
});

test('rows with no vehicle stay among the road groups', () => {
  const groups = groupByMode([row('a', 'LRT-1'), row('b', null), row('c', 'Bus')]);
  assert.deepEqual(shape(groups), [['b'], ['c'], ['a']]);
  assert.equal(groups[0].vehicle, null);
});
