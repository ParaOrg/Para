// A hotspot's label on the map (src/features/routes/model/hotspots.ts, nameOnMap): a
// station's name without its line in front, every other name as it is.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/name-on-map-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nameOnMap } from '../../src/features/routes/model/hotspots.ts';

test("a station's label leaves its line out", () => {
  assert.equal(nameOnMap({ name: 'MRT-3 Boni Station', line: 'MRT-3' }), 'Boni Station');
  assert.equal(
    nameOnMap({ name: 'LRT-2 Araneta Center - Cubao Station', line: 'LRT-2' }),
    'Araneta Center - Cubao Station',
  );
  assert.equal(nameOnMap({ name: 'PRFS Hulo Station', line: 'PRFS' }), 'Hulo Station');
});

test('the line is matched as written, whatever its case or spacing', () => {
  assert.equal(
    nameOnMap({ name: 'mrt-3  Guadalupe Station ', line: 'MRT-3' }),
    'Guadalupe Station',
  );
});

test('every other name is left as it is', () => {
  // A terminal or a jeepney hintuan: no line.
  assert.equal(
    nameOnMap({ name: 'SM City Fairview Jeepney Terminal', line: null }),
    'SM City Fairview Jeepney Terminal',
  );
  assert.equal(nameOnMap({ name: 'Fairview Teraccess' }), 'Fairview Teraccess');
  // A station whose name does not start with its line, or starts with another's.
  assert.equal(nameOnMap({ name: 'Taft Avenue Station', line: 'MRT-3' }), 'Taft Avenue Station');
  assert.equal(nameOnMap({ name: 'LRT-1 EDSA Station', line: 'MRT-3' }), 'LRT-1 EDSA Station');
  // Only the line, nothing after it: the name stays rather than going blank.
  assert.equal(nameOnMap({ name: 'MRT-3', line: 'MRT-3' }), 'MRT-3');
});
