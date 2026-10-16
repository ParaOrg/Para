// The word on SWITCH (src/features/routes/model/departures.ts, wayWord) and a
// train's bound (src/features/routes/model/rail-codes.ts, railBound): on the
// LRT and MRT, SWITCH says the way the train runs, as riders and the
// operators say it, not Papunta and Pabalik (the owner's ask of 2026-10-15).
// LRT-1 and MRT-3 run north–south; LRT-2 runs east–west.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/train-bound-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { railBound, stationNumber } from '../../src/features/routes/model/rail-codes.ts';
import { switchWord, wayWord } from '../../src/features/routes/model/departures.ts';

/** A direction as wayWord and railBound read it: its name, which way it runs, its route. */
const direction = (name, routeName, routeCode, reversed = false) => ({
  id: name,
  name,
  reversed,
  route: { name: routeName, routeCode },
});

/** The committed map's train directions, as published. */
const committedTrains = () =>
  JSON.parse(readFileSync(new URL('../../public/data/index.v4.json', import.meta.url), 'utf8'))
    .variants.filter((v) => ['LRT-1', 'LRT-2', 'MRT-3'].includes(v.route?.route_code))
    .map((v) => direction(v.direction_name, v.route.name, v.route.route_code, v.reversed));

test('a station number is its code’s digits, counted from the north or west end', () => {
  assert.equal(stationNumber('MRT-3', 'North Avenue'), 1);
  assert.equal(stationNumber('MRT-3', 'Taft Avenue'), 13);
  assert.equal(stationNumber('LRT-2', 'Recto'), 1);
  assert.equal(stationNumber('LRT-2', 'Antipolo'), 13);
  assert.equal(stationNumber('LRT-1', 'Fernando Poe Jr.'), 2);
  assert.equal(stationNumber('LRT-1', 'Dr. Santos'), 26);
  assert.equal(stationNumber('MRT-3', 'Recto'), null);
});

test('every train direction on the committed map has its bound, the two of a line opposite', () => {
  const bounds = Object.fromEntries(committedTrains().map((v) => [v.name, railBound(v)]));
  assert.deepEqual(bounds, {
    'North Avenue → Taft Avenue': 'Southbound',
    'Taft Avenue → North Avenue': 'Northbound',
    'Fernando Poe Jr. → Dr. Santos': 'Southbound',
    'Dr. Santos → Fernando Poe Jr.': 'Northbound',
    'Recto → Antipolo': 'Eastbound',
    'Antipolo → Recto': 'Westbound',
  });
});

test('a direction between two stations mid-line takes its bound from them', () => {
  const v = direction('Shaw Boulevard → Quezon Avenue', 'North Avenue – Taft Avenue', 'MRT-3');
  assert.equal(railBound(v), 'Northbound');
});

test('no bound for a jeep, the ferry, or an end the line’s table does not know', () => {
  assert.equal(railBound(direction('Tala → SM Fairview', 'Tala – SM Fairview', null)), null);
  assert.equal(
    railBound(direction('Escolta → Pinagbuhatan', 'Escolta – Pinagbuhatan', 'PRFS')),
    null,
  );
  assert.equal(
    railBound(direction('Nowhere → Taft Avenue', 'Nowhere – Taft Avenue', 'MRT-3')),
    null,
  );
});

test('with no name, the route’s name read the way the direction rides it', () => {
  const v = { ...direction(null, 'North Avenue – Taft Avenue', 'MRT-3', true), name: null };
  assert.equal(railBound(v), 'Northbound');
});

test('SWITCH says Papunta and Pabalik for jeeps, and when nothing is on show', () => {
  const jeep = direction('Tala → SM Fairview', 'Tala – SM Fairview', null);
  assert.equal(wayWord(false, [jeep]), 'Papunta');
  assert.equal(wayWord(true, [jeep]), 'Pabalik');
  assert.equal(wayWord(false, []), 'Papunta');
  assert.equal(wayWord(true, []), 'Pabalik');
});

test('SWITCH says a train’s bound, whichever way round is showing', () => {
  const [mrtSouth, mrtNorth] = [
    direction('North Avenue → Taft Avenue', 'North Avenue – Taft Avenue', 'MRT-3'),
    direction('Taft Avenue → North Avenue', 'North Avenue – Taft Avenue', 'MRT-3', true),
  ];
  assert.equal(wayWord(false, [mrtSouth]), 'Southbound');
  assert.equal(wayWord(true, [mrtNorth]), 'Northbound');
  const lrt2East = direction('Recto → Antipolo', 'Antipolo – Recto', 'LRT-2', true);
  assert.equal(wayWord(true, [lrt2East]), 'Eastbound');
});

test('one word fits every direction on show: mixed lists keep Papunta and Pabalik', () => {
  const mrtSouth = direction('North Avenue → Taft Avenue', 'North Avenue – Taft Avenue', 'MRT-3');
  const lrt2West = direction('Antipolo → Recto', 'Antipolo – Recto', 'LRT-2');
  const lrt1South = direction(
    'Fernando Poe Jr. → Dr. Santos',
    'Fernando Poe Jr. – Dr. Santos',
    'LRT-1',
  );
  const jeep = direction('Cubao → Tala', 'Cubao – Tala', null);
  const ferry = direction('Escolta → Pinagbuhatan', 'Escolta – Pinagbuhatan', 'PRFS');
  // Two lines bound the same way share the word.
  assert.equal(wayWord(false, [mrtSouth, lrt1South]), 'Southbound');
  // Bound different ways, or a train with a jeep or the ferry: the jeep words.
  assert.equal(wayWord(false, [mrtSouth, lrt2West]), 'Papunta');
  assert.equal(wayWord(true, [mrtSouth, jeep]), 'Pabalik');
  assert.equal(wayWord(false, [ferry]), 'Papunta');
});

test('SWITCH names the way a tap leads to: Pabalik over Papunta, the other bound on a train', () => {
  const jeep = direction('Tala → SM Fairview', 'Tala – SM Fairview', null);
  assert.equal(switchWord(false, [jeep]), 'Pabalik');
  assert.equal(switchWord(true, [jeep]), 'Papunta');
  const mrtSouth = direction('North Avenue → Taft Avenue', 'North Avenue – Taft Avenue', 'MRT-3');
  assert.equal(switchWord(false, [mrtSouth]), 'Northbound');
  const lrt2East = direction('Recto → Antipolo', 'Antipolo – Recto', 'LRT-2', true);
  assert.equal(switchWord(true, [lrt2East]), 'Westbound');
  const lrt2West = direction('Antipolo → Recto', 'Antipolo – Recto', 'LRT-2');
  assert.equal(switchWord(false, [mrtSouth, lrt2West]), 'Pabalik');
});
