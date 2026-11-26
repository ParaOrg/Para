// The route line detail's facts and stops (src/features/studio/panels/route-line-facts.ts): a
// loop's tip listed once, not as two stops of the same name, and the Transit line rows.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/route-line-facts-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeStops, transitLineFacts } from '../../src/features/studio/panels/route-line-facts.ts';

const row = (id, label) => ({ id, label, kind: 'hintuan' });

test('a route lists its start, its hintuans and its end, in order', () => {
  const timeline = { from: row('a', 'Tala'), between: [row('b', 'Kanlaon')], to: row('c', 'SM') };
  assert.deepEqual(
    routeStops(timeline, false).map((r) => r.label),
    ['Tala', 'Kanlaon', 'SM'],
  );
});

test('a loop lists its tip once: it leaves from it and comes back to it', () => {
  const tip = row('a', 'Cubao');
  const timeline = { from: tip, between: [row('b', 'Kamuning'), row('c', 'Kalayaan')], to: tip };
  assert.deepEqual(
    routeStops(timeline, true).map((r) => r.label),
    ['Cubao', 'Kamuning', 'Kalayaan'],
  );
});

test('no stops yet: an empty list', () => {
  assert.deepEqual(routeStops({ from: null, between: [], to: null }, false), []);
});

test('Transit line information: the full mode name, the via in the destination and its own row', () => {
  const direction = {
    id: 'd1',
    routeId: 'r1',
    reversed: false,
    name: 'Tala → SM Fairview',
    metres: 11_300,
    shape: {
      type: 'LineString',
      coordinates: [
        [121.0, 14.7],
        [121.05, 14.72],
      ],
    },
    route: { mode: 'uv_express', via: 'Maligaya', isLoop: false },
  };
  const timeline = { from: row('a', 'Tala'), between: [row('b', 'Kanlaon')], to: row('c', 'SM') };
  const facts = Object.fromEntries(
    transitLineFacts(direction, [direction], timeline).map((f) => [f.label, f.value]),
  );
  assert.equal(facts.Origin, 'Tala');
  assert.equal(facts.Destination, 'SM Fairview via Maligaya');
  assert.equal(facts.Via, 'Maligaya');
  assert.equal(facts['Transport mode'], 'UV Express');
  assert.equal(facts.Distance, '11.3km');
  assert.equal(facts.Stops, '3');
  assert.equal('EAT' in facts, false);
});
