// When the page is told where the commuter is (src/features/locator/where-told.ts): the first fix,
// a move of more than 50 m, and a vague fix sharpening where it stands.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/where-told-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { shouldTell } from '../../src/features/locator/where-told.ts';

const M_PER_DEG_LAT = 111_000;
const where = (northM, accuracyM) => ({ at: [121.07, 14.65 + northM / M_PER_DEG_LAT], accuracyM });

test('the first fix is told', () => {
  assert.equal(shouldTell(null, where(0, 10)), true);
});

test('a fix that has not moved 50 m is not told', () => {
  assert.equal(shouldTell(where(0, 10), where(30, 10)), false);
  assert.equal(shouldTell(where(0, 10), where(0, 5)), false, 'sharper still, but already sharp');
});

test('a move of more than 50 m is told', () => {
  assert.equal(shouldTell(where(0, 10), where(60, 10)), true);
});

test('a vague fix sharpening where it stands is told: the sharp one is the one that says where', () => {
  assert.equal(shouldTell(where(0, 800), where(0, 10)), true);
  assert.equal(shouldTell(where(0, 800), where(0, 200)), true, 'exactly the limit is sharp enough');
});

test('a vague fix staying vague is not told again where it stands', () => {
  assert.equal(shouldTell(where(0, 800), where(0, 500)), false);
  assert.equal(shouldTell(where(0, 800), where(10, 300)), false);
});
