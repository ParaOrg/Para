// The cards a list shows (src/features/routes/model/departures.ts, routeCards):
// a place's road directions on a RouteCard per mode, and its train and ferry
// directions on a RouteCardRailway each, one per line and bound; the cards run
// by mode.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/route-cards-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeCards } from '../../src/features/routes/model/departures.ts';

const LINE = {
  type: 'LineString',
  coordinates: [
    [121, 14],
    [121.01, 14.01],
  ],
};

/** A drawn direction leaving `from` for `to`, on a route of this mode and code. */
const direction = (id, from, to, mode, routeCode = null) => ({
  id,
  routeId: `route-${id}`,
  name: `${from} → ${to}`,
  reversed: false,
  shape: LINE,
  route: { name: `${from} – ${to}`, mode, routeCode },
});

const summary = (cards) =>
  cards.map((c) => ({
    card: c.card,
    from: c.from,
    railway: c.railway,
    bound: c.bound,
    ids: c.directions.map((d) => d.v.id),
  }));

test('a place with jeeps only keeps its one RouteCard, known by its name and mode', () => {
  const cards = routeCards(
    [
      direction('a', 'Tala', 'SM Fairview', 'jeepney'),
      direction('b', 'Tala', 'Novaliches', 'jeepney'),
    ],
    false,
  );
  assert.deepEqual(summary(cards), [
    { card: 'Tala|jeep', from: 'Tala', railway: null, bound: null, ids: ['a', 'b'] },
  ]);
});

test('a station gets a card per line and bound, after the place’s road card', () => {
  const cards = routeCards(
    [
      direction('east', 'Recto', 'Antipolo', 'lrt', 'LRT-2'),
      direction('jeep', 'Recto', 'Quiapo', 'jeepney'),
      direction('east2', 'Recto', 'Cubao', 'lrt', 'LRT-2'),
      direction('ferry', 'Recto', 'Pinagbuhatan', 'ferry', 'PRFS'),
    ],
    false,
  );
  assert.deepEqual(summary(cards), [
    { card: 'Recto|jeep', from: 'Recto', railway: null, bound: null, ids: ['jeep'] },
    {
      card: 'Recto|LRT-2|Eastbound',
      from: 'Recto',
      railway: 'LRT-2',
      bound: 'Eastbound',
      ids: ['east', 'east2'],
    },
    { card: 'Recto|Ferry|', from: 'Recto', railway: 'Ferry', bound: null, ids: ['ferry'] },
  ]);
});

test('two bounds of a line from one station are two cards', () => {
  const cards = routeCards(
    [
      direction('south', 'Shaw Boulevard', 'Taft Avenue', 'mrt', 'MRT-3'),
      direction('north', 'Shaw Boulevard', 'North Avenue', 'mrt', 'MRT-3'),
    ],
    false,
  );
  assert.deepEqual(
    summary(cards).map((c) => [c.card, c.ids]),
    [
      ['Shaw Boulevard|MRT-3|Southbound', ['south']],
      ['Shaw Boulevard|MRT-3|Northbound', ['north']],
    ],
  );
});

test('every road card comes first, then the train cards, then the ferry’s, each kind in the order met', () => {
  const cards = routeCards(
    [
      direction('ferry', 'Escolta', 'Pinagbuhatan', 'ferry', 'PRFS'),
      direction('jeep', 'Antipolo', 'Cubao', 'jeepney'),
      direction('lrt', 'Antipolo', 'Recto', 'lrt', 'LRT-2'),
      direction('mrt', 'Shaw Boulevard', 'Taft Avenue', 'mrt', 'MRT-3'),
      direction('jeep2', 'Cogeo', 'Cubao', 'jeepney'),
    ],
    false,
  );
  assert.deepEqual(
    summary(cards).map((c) => c.ids),
    [['jeep'], ['jeep2'], ['lrt'], ['mrt'], ['ferry']],
  );
});

test('a place’s road modes are a card each, and the cards run by mode: jeep, UV Express, e-jeep, bus', () => {
  const cards = routeCards(
    [
      direction('bus', 'Tala', 'PITX', 'bus'),
      direction('jeep', 'Tala', 'SM Fairview', 'jeepney'),
      direction('uv', 'Bigte', 'Buendia', 'uv_express'),
      direction('ejeep', 'Tala', 'Cubao', 'e_jeepney'),
      direction('jeep2', 'Bigte', 'Novaliches', 'jeepney'),
      direction('p2p', 'Tala', 'Makati', 'p2p'),
    ],
    false,
  );
  assert.deepEqual(
    cards.map((c) => [c.card, c.livery, c.directions.map((d) => d.v.id)]),
    [
      ['Tala|jeep', 'jeep', ['jeep']],
      ['Bigte|jeep', 'jeep', ['jeep2']],
      ['Tala|uv-express', 'uv-express', ['p2p']],
      ['Bigte|uv-express', 'uv-express', ['uv']],
      ['Tala|ejeep', 'ejeep', ['ejeep']],
      ['Tala|bus', 'bus', ['bus']],
    ],
  );
});
