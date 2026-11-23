// The contributor app's last known place (src/features/locator/last-known.ts): kept on the phone,
// read back after a restart, never anything but a [lng, lat] and a time; and how long ago its pill
// says it was.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/last-known-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { agoText, keepLastKnown, readLastKnown } from '../../src/features/locator/last-known.ts';

const NOW = Date.UTC(2026, 10, 6, 6, 0, 0);
const MINUTE = 60_000;

/** A phone's storage for one test. */
function withStorage(run) {
  const items = new Map();
  const real = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
  };
  try {
    return run(items);
  } finally {
    globalThis.localStorage = real;
  }
}

test('the pill says minutes, then hours, then days, and never "0 min ago"', () => {
  assert.equal(agoText(NOW - 10_000, NOW), '1 min ago');
  assert.equal(agoText(NOW - MINUTE, NOW), '1 min ago');
  assert.equal(agoText(NOW - 59 * MINUTE, NOW), '59 min ago');
  assert.equal(agoText(NOW - 60 * MINUTE, NOW), '1 hr ago');
  assert.equal(agoText(NOW - 23 * 60 * MINUTE, NOW), '23 hr ago');
  assert.equal(agoText(NOW - 24 * 60 * MINUTE, NOW), '1 day ago');
  assert.equal(agoText(NOW - 12 * 24 * 60 * MINUTE, NOW), '12 days ago');
  // A fix stamped a moment ahead of the clock still reads as a minute.
  assert.equal(agoText(NOW + 5_000, NOW), '1 min ago');
});

test('a place kept is read back, as kept, after the app starts again', () => {
  withStorage(() => {
    assert.equal(readLastKnown(), null);
    keepLastKnown({ at: [121.0, 14.6], time: NOW });
    assert.deepEqual(readLastKnown(), { at: [121.0, 14.6], time: NOW });
  });
});

test('a kept copy that does not read is no place at all', () => {
  for (const junk of ['not json', '{"at":[121],"time":1}', '{"at":[121,14.6]}', 'null']) {
    withStorage((items) => {
      items.set('para.contributor.last-location.v1', junk);
      assert.equal(readLastKnown(), null, junk);
    });
  }
});
