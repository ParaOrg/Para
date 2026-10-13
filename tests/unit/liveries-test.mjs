// The route cards' colours (src/features/routes/model/liveries.ts): at random, kept for the
// visit, and never the same twice side by side — the owner's rule of
// 2026-09-28. Each card by its rows' route ids since 2026-10-12, the first
// row's first (the owner: a route keeps its colour whichever way round the
// list shows it); the names below stand in for ids.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/liveries-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cardLiveries,
  JEEPNEY_LIVERIES,
  liveriesFor,
} from '../../src/features/routes/model/liveries.ts';

/** A stand-in for Math.random that plays back the given draws, then repeats the last. */
const draws = (...xs) => {
  let i = 0;
  return () => xs[Math.min(i++, xs.length - 1)];
};
const neighboursDiffer = (ls) => ls.every((l, i) => i === 0 || l !== ls[i - 1]);

test('the colour is a draw: different draws, different colours', () => {
  const first = liveriesFor([['Tala']], draws(0), new Map());
  const last = liveriesFor([['Tala']], draws(0.99), new Map());
  assert.notEqual(first[0], last[0]);
  assert.ok(JEEPNEY_LIVERIES.includes(first[0]) && JEEPNEY_LIVERIES.includes(last[0]));
});

test('a route keeps its colour for the visit, whatever is drawn after', () => {
  const visit = new Map();
  const [tala] = liveriesFor([['Tala']], draws(0.5), visit);
  for (const x of [0, 0.3, 0.7, 0.99]) {
    assert.equal(liveriesFor([['Tala']], draws(x), visit)[0], tala);
  }
});

test('two cards side by side are never alike, even when every draw is the same', () => {
  const places = [
    'Novaliches (Bayan)',
    'SM Fairview',
    'Tala',
    'Lagro',
    'Fatima',
    'Quiapo',
    'Cubao',
  ];
  for (const x of [0, 0.25, 0.5, 0.75, 0.99]) {
    assert.ok(
      neighboursDiffer(
        liveriesFor(
          places.map((p) => [p]),
          draws(x),
          new Map(),
        ),
      ),
      `draw ${x}`,
    );
  }
});

test('two routes that met apart in the same colour, now side by side: the second draws again, and keeps it', () => {
  const visit = new Map([
    ['Tala', 'red'],
    ['Lagro', 'red'],
  ]);
  const shown = liveriesFor([['Tala'], ['Lagro']], draws(0), visit);
  assert.equal(shown[0], 'red');
  assert.notEqual(shown[1], 'red');
  // …and keeps what it drew (the owner's ask, 2026-10-12: nothing changes
  // colour at random): apart again, the same; it went back to red until then.
  assert.equal(liveriesFor([['Lagro']], draws(0.99), visit)[0], shown[1]);
});

test('a new route avoids the colour of a kept neighbour on either side', () => {
  const visit = new Map([
    ['Tala', 'red'],
    ['Lagro', 'orange'],
  ]);
  for (const x of [0, 0.3, 0.6, 0.99]) {
    const [, middle] = liveriesFor([['Tala'], ['Fatima'], ['Lagro']], draws(x), new Map(visit));
    assert.ok(middle !== 'red' && middle !== 'orange', `draw ${x} gave ${middle}`);
  }
});

test('a route keeps its colour the other way round: the same id, the same draw', () => {
  const visit = new Map();
  const [a, b] = liveriesFor([['r1'], ['r2']], draws(0.2), visit);
  // Pabalik lists the same routes, perhaps in another order: the same colours.
  const [b2, a2] = liveriesFor([['r2'], ['r1']], draws(0.9), visit);
  assert.equal(a2, a);
  assert.equal(b2, b);
  // A route the way back adds as a card of its own draws a colour of its own, and keeps it.
  const [, , c] = liveriesFor([['r1'], ['r2'], ['r3']], draws(0.5), visit);
  assert.ok(c !== a && c !== b);
  assert.equal(liveriesFor([['r3']], draws(0.1), visit)[0], c);
});

// The owner, 2026-09-30: "make the routecard not repeating the color, it must
// exhaust the existing colors before repeating it".
test('no colour twice in a list until every colour has come once', () => {
  const places = Array.from({ length: JEEPNEY_LIVERIES.length * 2 + 3 }, (_, i) => `Place ${i}`);
  for (const x of [0, 0.3, 0.6, 0.99]) {
    const ls = liveriesFor(
      places.map((p) => [p]),
      draws(x),
      new Map(),
    );
    for (let start = 0; start < ls.length; start += JEEPNEY_LIVERIES.length) {
      const round = ls.slice(start, start + JEEPNEY_LIVERIES.length);
      assert.equal(new Set(round).size, round.length, `draw ${x}: ${round.join(', ')}`);
    }
    assert.ok(neighboursDiffer(ls), `draw ${x}`);
  }
});

test('two routes kept in one colour, in one list: the second draws again, and keeps it', () => {
  const visit = new Map([
    ['Tala', 'red'],
    ['Lagro', 'red'],
  ]);
  const shown = liveriesFor([['Tala'], ['Fatima'], ['Lagro']], draws(0), visit);
  assert.equal(shown[0], 'red');
  assert.equal(new Set(shown).size, 3);
  assert.equal(liveriesFor([['Lagro']], draws(0.99), visit)[0], shown[2]);
});

test('a new route leaves the colours kept further down the list', () => {
  const visit = new Map([['Lagro', 'orange']]);
  for (const x of [0, 0.3, 0.6, 0.99]) {
    const [, lagro] = liveriesFor([['Fatima'], ['Lagro']], draws(x), new Map(visit));
    assert.equal(lagro, 'orange', `draw ${x}`);
  }
});

// The reviewer's construction, 2026-10-12: a redraw that lands on the kept
// colour of a route that only leads a card the other way round would clash
// there, and change again on the way back. A redraw stays clear of every
// listed route's kept colour, so the turn finds nothing to redraw.
test('a redraw clears every listed route, so the way round and back settles', () => {
  const visit = new Map([
    ['P', 'violet'],
    ['X', 'red'],
    ['Q', 'rose'],
    ['Y', 'orange'],
    ['R', 'red'],
  ]);
  const papunta = [['P', 'X'], ['Q'], ['Y'], ['R']];
  const pabalik = [['P'], ['X'], ['Q', 'Y'], ['R']];
  assert.deepEqual(liveriesFor(papunta, draws(0), visit), ['violet', 'rose', 'orange', 'red']);
  // R clashes with X's red on the way back: it draws again, clear of Y's orange too.
  const turned = liveriesFor(pabalik, draws(0), visit);
  assert.deepEqual(turned, ['violet', 'red', 'rose', 'fuchsia']);
  assert.deepEqual(liveriesFor(papunta, draws(0.99), visit), [
    'violet',
    'rose',
    'orange',
    'fuchsia',
  ]);
  assert.deepEqual(liveriesFor(pabalik, draws(0.5), visit), turned);
});

// The owner's train RouteCards, 2026-10-13: a train route wears its line's
// colour, never a draw, and the jeepneys around it draw as they would
// without it.
test("a train card wears its line's colour, whatever is drawn", () => {
  for (const x of [0, 0.5, 0.99]) {
    assert.deepEqual(
      cardLiveries(
        [['lrt1'], ['lrt2'], ['mrt3']],
        ['LRT-1', 'LRT-2', 'MRT-3'],
        draws(x),
        new Map(),
      ),
      ['light-rail-way-one', 'light-rail-way-two', 'metro-rail-way-three'],
    );
  }
});

test('a train card changes nothing the jeepneys draw, and keeps no draw for the visit', () => {
  const jeepneys = [['Tala'], ['Fatima'], ['Lagro'], ['Bayan']];
  for (const x of [0, 0.3, 0.6, 0.99]) {
    const alone = liveriesFor(jeepneys, draws(x), new Map());
    const visit = new Map();
    const mixed = cardLiveries(
      [['lrt1'], ...jeepneys.slice(0, 2), ['mrt3'], ...jeepneys.slice(2)],
      ['LRT-1', null, null, 'MRT-3', null, null],
      draws(x),
      visit,
    );
    assert.deepEqual(mixed, [
      'light-rail-way-one',
      alone[0],
      alone[1],
      'metro-rail-way-three',
      alone[2],
      alone[3],
    ]);
    assert.ok(!visit.has('lrt1') && !visit.has('mrt3'), `draw ${x}`);
  }
});
