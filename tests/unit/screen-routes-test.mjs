// The contributor page's screen registry (src/features/contribute/navigation/screen-routes.ts): each
// screen a hash opens, its place in the toolbar's order, and its tab.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/screen-routes-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREENS, orderOf } from '../../src/features/contribute/navigation/screen-routes.ts';

const screens = Object.values(SCREENS);

test('no two screens share a hash', () => {
  const hashes = screens.map((screen) => screen.hash);
  assert.equal(new Set(hashes).size, hashes.length);
});

test('no two screens share an order, but the screens side by side inside Account settings', () => {
  const orders = screens
    .filter((screen) => screen !== SCREENS.deleteAccount)
    .map((screen) => screen.order);
  assert.equal(new Set(orders).size, orders.length);
  assert.equal(SCREENS.deleteAccount.order, SCREENS.changePassword.order);
});

test('every hash starts with #, but Record, which has none', () => {
  assert.equal(SCREENS.record.hash, '');
  for (const screen of screens.filter((each) => each !== SCREENS.record)) {
    assert.ok(screen.hash.startsWith('#'), screen.hash);
  }
});

test('orderOf finds a screen by its hash, and nothing for any other', () => {
  assert.equal(orderOf(''), 0);
  assert.equal(orderOf('#history'), 1);
  assert.equal(orderOf('#delete-account'), 4);
  assert.equal(orderOf('#nowhere'), undefined);
});
