// Where a picked box lands the other way round (src/features/routes/model/places.ts,
// boxTheOtherWay): the same box when the other way passes it, else the
// nearest box of its place that the other way passes, else nothing.
// HintuanCard's SWITCH has moved its selection so since 2026-10-01; a jeep's
// trip keeps its picked hintuan the same way over Papunta and Pabalik since
// 2026-10-15 (the owner: "trains reset, jeeps keep").
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/other-way-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boxTheOtherWay } from '../../src/features/routes/model/places.ts';

let n = 0;
/** A hintuan box at [lng, 14.7] of the place people call `informal`: sample data. */
const box = (name, lng, informal) => ({
  id: `s${n++}`,
  kind: 'hintuan',
  name,
  informal,
  aliases: [],
  point: { type: 'Point', coordinates: [lng, 14.7] },
  createdAt: `2026-10-15T00:00:0${n % 10}Z`,
});

/** The other way passes exactly these boxes. */
const passing = (...boxes) => {
  const ids = new Set(boxes.map((b) => b.id));
  return (id) => ids.has(id);
};

test('a box the other way passes too stays the pick: one drawn across both sides of the road', () => {
  const across = box('Betty Go - Belmonte', 121.03, 'Betty Go');
  assert.equal(boxTheOtherWay(across, [across], passing(across)), across);
});

test('a box the other way misses lands on its place’s box across the road', () => {
  const thisSide = box('Lagro 1', 121.0, 'Lagro');
  const acrossTheRoad = box('Lagro 2', 121.0003, 'Lagro');
  const all = [thisSide, acrossTheRoad];
  assert.equal(boxTheOtherWay(thisSide, all, passing(acrossTheRoad)), acrossTheRoad);
});

test('of several boxes of the place the other way passes, the nearest', () => {
  const picked = box('SM Fairview Main Babaan', 121.0, 'SM Fairview');
  const far = box('SM Fairview Terminal B', 121.004, 'SM Fairview');
  const near = box('SM Fairview Ilalim', 121.001, 'SM Fairview');
  assert.equal(boxTheOtherWay(picked, [picked, far, near], passing(far, near)), near);
});

test('another place’s box is never the landing, however near: no box of the place, no pick', () => {
  const picked = box('Lagro 1', 121.0, 'Lagro');
  const nextDoor = box('Bestlink', 121.0001, 'Bestlink');
  assert.equal(boxTheOtherWay(picked, [picked, nextDoor], passing(nextDoor)), null);
});

test('nothing the other way passes: no pick, the ride turns whole', () => {
  const picked = box('Lagro 1', 121.0, 'Lagro');
  const sibling = box('Lagro 2', 121.0003, 'Lagro');
  assert.equal(boxTheOtherWay(picked, [picked, sibling], passing()), null);
});
