// The studio's Transportation mode picker (src/features/studio/panels/mode-choices.ts): no new
// route is made P2P, lines come in by their import, and a route that already has either keeps it.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/mode-choices-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modeChoices } from '../../src/features/studio/panels/mode-choices.ts';

const values = (current) => modeChoices(current).map((m) => m.value);

test('a new or ordinary route is offered no P2P, no train and no ferry', () => {
  const offered = values('jeepney');
  assert.ok(!offered.includes('p2p'));
  for (const line of ['lrt', 'mrt', 'ferry']) assert.ok(!offered.includes(line), line);
  assert.deepEqual(offered, ['jeepney', 'e_jeepney', 'uv_express', 'bus', 'tricycle']);
});

test('a route already saved as P2P still shows it, beside Bus to switch to', () => {
  const offered = values('p2p');
  assert.ok(offered.includes('p2p'));
  assert.ok(offered.includes('bus'));
});

test('a line keeps its own mode listed', () => {
  assert.ok(values('lrt').includes('lrt'));
  assert.ok(!values('lrt').includes('mrt'));
});
