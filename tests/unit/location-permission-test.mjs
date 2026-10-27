// Whether the browser already lets the page read the location
// (src/features/locator/location-permission.ts): only a plain "granted" starts the locator.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/location-permission-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isLocationGranted } from '../../src/features/locator/location-permission.ts';

/** Runs `body` with `navigator` standing in as given, and puts the real one back. */
async function withNavigator(stand, body) {
  const real = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: stand });
  try {
    return await body();
  } finally {
    if (real) Object.defineProperty(globalThis, 'navigator', real);
  }
}

const saying = (state) => ({ permissions: { query: async () => ({ state }) } });

test('granted starts the locator; asked and refused do not', async () => {
  assert.equal(await withNavigator(saying('granted'), isLocationGranted), true);
  assert.equal(await withNavigator(saying('prompt'), isLocationGranted), false);
  assert.equal(await withNavigator(saying('denied'), isLocationGranted), false);
});

test('a browser without the Permissions API, or one that throws, does not start it', async () => {
  assert.equal(await withNavigator({}, isLocationGranted), false);
  const throws = {
    permissions: {
      query: async () => {
        throw new TypeError('not a permission name');
      },
    },
  };
  assert.equal(await withNavigator(throws, isLocationGranted), false);
});
