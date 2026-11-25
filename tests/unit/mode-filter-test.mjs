// The route list's filter (src/features/routes/model/mode-filter.ts): All keeps every route; each
// other option keeps one kind of ride (P2P by its route's mode, the rest by vehicle), so a
// tricycle shows under All only.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/mode-filter-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MODES,
  MODE_FILTERS,
  modesPicked,
  passesModeFilter,
  passesModePicks,
  pickCount,
  picksOf,
  togglePick,
} from '../../src/features/routes/model/mode-filter.ts';

/** A direction on a route of this mode and code. */
const direction = (id, mode, routeCode = null) => ({
  id,
  routeId: `route-${id}`,
  name: id,
  reversed: false,
  route: { name: id, mode, routeCode },
});

const ROUTES = [
  direction('jeep', 'jeepney'),
  direction('ejeep', 'e_jeepney'),
  direction('bus', 'bus'),
  direction('uv', 'uv_express'),
  direction('p2p', 'p2p'),
  direction('trike', 'tricycle'),
  direction('lrt1', 'lrt', 'LRT-1'),
  direction('lrt2', 'lrt', 'LRT-2'),
  direction('mrt3', 'mrt', 'MRT-3'),
  direction('ferry', 'ferry', 'PRFS'),
];

const kept = (filter) => ROUTES.filter((d) => passesModeFilter(d, filter)).map((d) => d.id);

test('All keeps every route', () => {
  assert.deepEqual(
    kept('all'),
    ROUTES.map((d) => d.id),
  );
});

test('each option keeps its own ride', () => {
  assert.deepEqual(
    Object.fromEntries(MODE_FILTERS.filter((f) => f !== 'all').map((f) => [f, kept(f)])),
    {
      jeep: ['jeep'],
      ejeep: ['ejeep'],
      uv: ['uv'],
      bus: ['bus'],
      p2p: ['p2p'],
      lrt: ['lrt1', 'lrt2'],
      mrt: ['mrt3'],
      ferry: ['ferry'],
    },
  );
});

test('a tricycle shows under All only', () => {
  for (const f of MODE_FILTERS) assert.equal(kept(f).includes('trike'), f === 'all', f);
});

test("the options in the owner's order", () => {
  assert.deepEqual(MODE_FILTERS, [
    'all',
    'jeep',
    'ejeep',
    'uv',
    'bus',
    'p2p',
    'lrt',
    'mrt',
    'ferry',
  ]);
});

test('jeep, UV Express and bus together keep those three', () => {
  assert.deepEqual(keptBy(['jeep', 'uv', 'bus']), ['jeep', 'bus', 'uv']);
});

const keptBy = (picks) => ROUTES.filter((d) => passesModePicks(d, picks)).map((d) => d.id);

test('several modes picked keep the routes of any of them', () => {
  assert.deepEqual(keptBy(['jeep', 'bus']), ['jeep', 'bus']);
  assert.deepEqual(keptBy(['lrt', 'mrt', 'ferry']), ['lrt1', 'lrt2', 'mrt3', 'ferry']);
});

test('none picked, or every mode picked, keeps every route: both read as All', () => {
  const every = ROUTES.map((d) => d.id);
  assert.deepEqual(keptBy([]), every);
  assert.deepEqual(keptBy(MODES), every);
  assert.equal(pickCount([]), 0);
  assert.equal(pickCount(MODES), 0);
});

test('the count is how many modes are picked', () => {
  assert.equal(pickCount(['jeep']), 1);
  assert.equal(pickCount(['jeep', 'bus', 'mrt']), 3);
});

test('a single choice is the picks of that one mode, and passes as before', () => {
  assert.deepEqual(picksOf('all'), []);
  assert.deepEqual(picksOf('bus'), ['bus']);
  assert.equal(modesPicked('all'), 0);
  assert.equal(modesPicked('ferry'), 1);
  for (const filter of MODE_FILTERS) {
    assert.deepEqual(kept(filter), keptBy(picksOf(filter)), filter);
  }
});

test('a toggle picks or lets go, in the filter order; the last mode left out picked reads as All', () => {
  assert.deepEqual(togglePick([], 'bus'), ['bus']);
  assert.deepEqual(togglePick(['bus'], 'jeep'), ['jeep', 'bus']);
  assert.deepEqual(togglePick(['jeep', 'bus'], 'bus'), ['jeep']);
  assert.deepEqual(togglePick(['jeep'], 'jeep'), []);
  const allButFerry = MODES.filter((m) => m !== 'ferry');
  assert.deepEqual(togglePick(allButFerry, 'ferry'), []);
});
