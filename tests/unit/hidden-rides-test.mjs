// The rides deleted from History on this phone (src/features/contribute/storage/hidden-rides.ts):
// kept so an upload Para still holds does not come back, read with Zod, and nothing hidden when
// the phone's storage cannot be read.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/hidden-rides-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hideRide, readHiddenRides } from '../../src/features/contribute/storage/hidden-rides.ts';

const KEY = 'para-hidden-rides';
const RIDE_A = '11111111-0000-4000-8000-000000000001';
const RIDE_B = '22222222-0000-4000-8000-000000000002';

/** A fake localStorage holding `raw` under the list's key, or nothing for null. */
const stored = (raw) => {
  const store = new Map(raw === null ? [] : [[KEY, raw]]);
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
  return store;
};

/** A localStorage that refuses every read and write, as a locked-down browser's can. */
const refusing = () => {
  const refuse = () => {
    throw new Error('denied');
  };
  globalThis.localStorage = { getItem: refuse, setItem: refuse, removeItem: refuse };
};

/** The page's warning, kept out of the test's output and counted. */
const quietWarnings = (t) => t.mock.method(console, 'warn', () => {});

test('nothing stored hides nothing', () => {
  stored(null);
  assert.deepEqual([...readHiddenRides()], []);
});

test('a hidden ride is kept, and so are the ones hidden before it', () => {
  const store = stored(null);
  assert.deepEqual([...hideRide(RIDE_A)], [RIDE_A]);
  assert.deepEqual([...hideRide(RIDE_B)], [RIDE_A, RIDE_B]);
  assert.deepEqual([...readHiddenRides()], [RIDE_A, RIDE_B]);
  assert.equal(store.get(KEY), JSON.stringify([RIDE_A, RIDE_B]));
});

test('hiding the same ride twice keeps it once', () => {
  stored(JSON.stringify([RIDE_A]));
  assert.deepEqual([...hideRide(RIDE_A)], [RIDE_A]);
});

test('what is not a list of ride ids hides nothing', (t) => {
  const warn = quietWarnings(t);
  for (const raw of ['not json', '{"id":1}', JSON.stringify(['not-a-ride-id']), '42']) {
    stored(raw);
    assert.deepEqual([...readHiddenRides()], [], raw);
  }
  // Only the unreadable JSON is a warning; a list of the wrong shape is quietly none.
  assert.equal(warn.mock.callCount(), 1);
});

test('storage that refuses hides nothing, and a hide still counts until History closes', (t) => {
  const warn = quietWarnings(t);
  refusing();
  assert.deepEqual([...readHiddenRides()], []);
  assert.deepEqual([...hideRide(RIDE_A)], [RIDE_A]);
  assert.ok(warn.mock.callCount() >= 2);
});
