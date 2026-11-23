// The route list's filter (src/features/routes/model/mode-filter.ts): All keeps every route; each
// other option keeps one kind of ride, by vehicle, so a tricycle, P2P and UV Express show under
// All only.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/mode-filter-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODE_FILTERS, passesModeFilter } from '../../src/features/routes/model/mode-filter.ts';

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
      bus: ['bus'],
      lrt: ['lrt1', 'lrt2'],
      mrt: ['mrt3'],
      ferry: ['ferry'],
    },
  );
});

test('a tricycle, P2P and UV Express show under All only', () => {
  for (const id of ['trike', 'p2p', 'uv'])
    for (const f of MODE_FILTERS)
      assert.equal(kept(f).includes(id), f === 'all', `${id} under ${f}`);
});
