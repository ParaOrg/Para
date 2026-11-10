// What stops at a hotspot, for place search on the public map and in the studio
// (src/features/routes/model/directions-at.ts): the map's links read against its directions.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/directions-at-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { directionsAtHotspots } from '../../src/features/routes/model/directions-at.ts';

const direction = (id) => ({ id, name: `${id} → there`, route: null });

test("a hotspot's directions in its links' order, those not on the map left out", () => {
  const links = { h1: ['d2', 'gone', 'd1'], h2: [] };
  const at = directionsAtHotspots([direction('d1'), direction('d2')], (id) => links[id] ?? []);
  assert.deepEqual(
    at('h1').map(({ id }) => id),
    ['d2', 'd1'],
  );
  assert.deepEqual(at('h2'), []);
  assert.deepEqual(at('unknown'), []);
});
