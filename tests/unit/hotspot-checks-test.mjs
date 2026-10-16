// What the studio's hotspot panel works out from its form
// (src/features/studio/panels/hotspot-checks.ts): the routes grouped under
// their names, the informal names offered, a terminal's ticks, and why a
// save is refused before anything is written.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/hotspot-checks-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  groupBySignboard,
  hotspotRefusal,
  knownInformalNames,
  tickedDirections,
} from '../../src/features/studio/panels/hotspot-checks.ts';

let n = 0;
/** A box at [lng, 14.7], shaped like the stop rows. */
const box = (name, lng, kind = 'hintuan', informal = null) => ({
  id: `s${n++}`,
  kind,
  name,
  informal,
  aliases: [],
  point: { type: 'Point', coordinates: [lng, 14.7] },
});
const direction = (id, routeId, routeName, name) => ({
  id,
  routeId,
  name,
  route: routeName === undefined ? undefined : { name: routeName },
});
const SQUARE = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];
const BOWTIE = [
  [0, 0],
  [1, 1],
  [1, 0],
  [0, 1],
];

test('directions grouped under their route, the routes in name order, unnamed ones so marked', () => {
  const groups = groupBySignboard([
    direction('a1', 'r1', 'Tala', 'Tala → Fairview'),
    direction('b1', 'r2', 'Bestlink', 'Bestlink → Tala'),
    direction('a2', 'r1', 'Tala', 'Fairview → Tala'),
    direction('c1', 'r3', undefined, 'Somewhere'),
  ]);
  assert.deepEqual(
    groups.map((g) => [g.signboard, g.directions.map((v) => v.id)]),
    [
      ['(unnamed)', ['c1']],
      ['Bestlink', ['b1']],
      ['Tala', ['a1', 'a2']],
    ],
  );
});

test('the informal names in use: each once whatever its case, in order, the box itself left out', () => {
  const me = box('SM Fairview Ilalim', 121.0, 'hintuan', 'SM Fairview');
  const names = knownInformalNames(
    [me, box('Tala Ilalim', 121.1, 'hintuan', 'Tala'), box('TALA Taas', 121.2, 'hintuan', 'tala')],
    me.id,
  );
  assert.equal(names.length, 1);
  assert.equal(names[0].toLowerCase(), 'tala');
  assert.deepEqual(knownInformalNames([], undefined), []);
});

test("a terminal's ticks: the pre-ticks, with the owner's ticks and unticks over them", () => {
  assert.deepEqual([...tickedDirections(null, new Map())], []);
  assert.deepEqual(
    [
      ...tickedDirections(
        new Set(['a', 'b']),
        new Map([
          ['b', false],
          ['c', true],
        ]),
      ),
    ].sort(),
    ['a', 'c'],
  );
});

test('an outline whose sides cross is refused, whatever its kind', () => {
  const form = { kind: 'hintuan', hotspots: [], hotspotId: null, name: 'X', informal: '' };
  assert.match(hotspotRefusal({ ...form, ring: BOWTIE }), /cross each other/);
  assert.equal(hotspotRefusal({ ...form, ring: SQUARE }), null);
});

test('a second terminal at a place is refused; a hintuan there, or the terminal itself, is not', () => {
  const tala = box('Tala', 121.0, 'terminal');
  const hotspots = [tala];
  const form = { ring: SQUARE, hotspots, name: 'Tala Terminal B', informal: 'Tala' };
  assert.match(
    hotspotRefusal({ ...form, kind: 'terminal', hotspotId: null }),
    /already has a terminal \("Tala"\)/,
  );
  assert.equal(hotspotRefusal({ ...form, kind: 'hintuan', hotspotId: null }), null);
  assert.equal(
    hotspotRefusal({ ...form, kind: 'terminal', hotspotId: tala.id, name: 'Tala', informal: '' }),
    null,
  );
});
