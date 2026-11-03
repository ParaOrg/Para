// What the route list under a tap lists (src/features/routes/model/departures.ts,
// chooserDepartures, and routeCards with 'every-line'): every line under the
// finger, a route with nothing drawn the way round shown by its drawn direction,
// under the place that one leaves from.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/chooser-departures-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chooserDepartures,
  drawnDepartures,
  routeCards,
} from '../../src/features/routes/model/departures.ts';

const LINE = {
  type: 'LineString',
  coordinates: [
    [121, 14],
    [121.01, 14.01],
  ],
};

/** A direction of route `routeId` from `from` to `to`; `drawn` false leaves it a slot. Sample data only. */
const direction = (routeId, from, to, reversed, drawn = true) => ({
  id: `${routeId}-${reversed ? 'back' : 'out'}`,
  routeId,
  name: `${from} → ${to}`,
  reversed,
  confidence: 'drawn',
  shape: drawn ? LINE : null,
  route: { name: reversed ? `${to} – ${from}` : `${from} – ${to}`, mode: 'jeepney' },
});

const summary = (places) => places.map((p) => [p.from, p.directions.map((d) => d.v.id)]);

// The published map's case: SM Fairview → Cubao runs on Novaliches → Tala,
// whose Tala → Novaliches is still a slot.
const tala = [
  direction('tala', 'Tala', 'Novaliches', false, false),
  direction('tala', 'Novaliches', 'Tala', true),
];
const cubao = [
  direction('cubao', 'SM Fairview', 'Cubao', false),
  direction('cubao', 'Cubao', 'SM Fairview', true),
];

test('a route with nothing drawn the way round shown is listed by its drawn direction, under its own place', () => {
  assert.deepEqual(summary(chooserDepartures([...tala, ...cubao], false)), [
    ['Novaliches', ['tala-back']],
    ['SM Fairview', ['cubao-out']],
  ]);
  // A place's card keeps to the way round shown.
  assert.deepEqual(summary(drawnDepartures([...tala, ...cubao], false)), [
    ['SM Fairview', ['cubao-out']],
  ]);
});

test('the list’s cards and count follow it: two routes, two cards', () => {
  const cards = routeCards([...cubao, ...tala], false, 'every-line');
  assert.deepEqual(
    cards.map((c) => [c.card, c.directions.map((d) => d.v.id)]),
    [
      ['SM Fairview', ['cubao-out']],
      ['Novaliches', ['tala-back']],
    ],
  );
  assert.deepEqual(
    routeCards([...cubao, ...tala], false).map((c) => c.card),
    ['SM Fairview'],
  );
});

test('a fallen-back direction joins a place already listed', () => {
  const fromNovaliches = [direction('lagro', 'Novaliches', 'Lagro', false)];
  assert.deepEqual(summary(chooserDepartures([...fromNovaliches, ...tala], false)), [
    ['Novaliches', ['lagro-out', 'tala-back']],
  ]);
});

test('where the way round shown is drawn, nothing changes', () => {
  for (const back of [false, true]) {
    assert.deepEqual(
      chooserDepartures(cubao, back),
      drawnDepartures(cubao, back),
      `way back ${back}`,
    );
  }
  // Tala's way back is drawn: shown the way back, it is listed as before.
  assert.deepEqual(
    chooserDepartures([...tala, ...cubao], true),
    drawnDepartures([...tala, ...cubao], true),
  );
});

test('a route with nothing drawn is still no row', () => {
  const slots = [
    direction('slot', 'Lagro', 'Fatima', false, false),
    direction('slot', 'Fatima', 'Lagro', true, false),
  ];
  assert.deepEqual(summary(chooserDepartures([...slots, ...cubao], false)), [
    ['SM Fairview', ['cubao-out']],
  ]);
  assert.deepEqual(chooserDepartures(slots, true), []);
});
