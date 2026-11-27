// The route line detail's facts and stops (src/features/studio/panels/route-line-facts.ts): a
// loop's tip listed once, not as two stops of the same name, the summary card and the Transit
// line rows.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/route-line-facts-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  routeStops,
  routeSummaryFacts,
  transitLineFacts,
} from '../../src/features/studio/panels/route-line-facts.ts';

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

const DIRECTION = {
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
  route: { mode: 'jeepney', via: 'Maligaya', isLoop: false },
};
const TIMELINE = { from: row('a', 'Tala'), between: [row('b', 'Kanlaon')], to: row('c', 'SM') };
const asRecord = (facts) => Object.fromEntries(facts.map((f) => [f.label, f.value]));

test('the summary card: where it runs, the via in the destination and its own row, and Status', () => {
  const draft = routeSummaryFacts(DIRECTION, [DIRECTION], TIMELINE, 'draft');
  const facts = asRecord(draft);
  assert.deepEqual(Object.keys(facts), ['Origin', 'Destination', 'Via', 'Status']);
  assert.equal(facts.Origin, 'Tala');
  assert.equal(facts.Destination, 'SM Fairview via Maligaya');
  assert.equal(facts.Via, 'Maligaya');
  assert.equal(facts.Status, 'Draft');
  assert.equal(draft.at(-1).isAlert, true);
  const published = routeSummaryFacts(DIRECTION, [DIRECTION], TIMELINE, 'published');
  assert.equal(published.at(-1).value, 'Published');
  assert.equal(published.at(-1).isAlert, false);
});

test('Transit line information: fare, mode as a trip names it, distance and stops, no EAT', () => {
  const facts = asRecord(transitLineFacts(DIRECTION, [DIRECTION], TIMELINE));
  assert.deepEqual(Object.keys(facts), ['Regular fare', 'Transport mode', 'Distance', 'Stops']);
  assert.equal(facts['Transport mode'], 'Jeep');
  assert.equal(facts.Distance, '11.3km');
  assert.equal(facts.Stops, '3');
});

test('a mode with no vehicle of its own keeps the studio word', () => {
  const p2p = { ...DIRECTION, route: { ...DIRECTION.route, mode: 'p2p' } };
  assert.equal(asRecord(transitLineFacts(p2p, [p2p], TIMELINE))['Transport mode'], 'P2P bus');
});
