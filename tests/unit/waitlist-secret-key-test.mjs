// The waitlist Edge Function's secret key (supabase/functions/waitlist/secret-key.ts): the "default"
// key from SUPABASE_SECRET_KEYS, or an error naming what is wrong, never the text "undefined".
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/waitlist-secret-key-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { defaultSecretKey } from '../../supabase/functions/waitlist/secret-key.ts';

test('the "default" key is the one taken, whatever other keys sit beside it', () => {
  assert.equal(defaultSecretKey('{"default":"sb_secret_a","ci":"sb_secret_b"}'), 'sb_secret_a');
});

test('no "default" key stops the function instead of sending "undefined"', () => {
  assert.throws(() => defaultSecretKey('{"ci":"sb_secret_b"}'), /has no "default" key/);
  assert.throws(() => defaultSecretKey('{}'), /has no "default" key/);
});

test('an empty or non-text "default" key stops it too', () => {
  assert.throws(() => defaultSecretKey('{"default":""}'), /empty or not text/);
  assert.throws(() => defaultSecretKey('{"default":null}'), /empty or not text/);
  assert.throws(() => defaultSecretKey('{"default":42}'), /empty or not text/);
});

test('keys that are not a JSON object are named as such', () => {
  assert.throws(() => defaultSecretKey('sb_secret_a'), /is not JSON/);
  assert.throws(() => defaultSecretKey('null'), /has no "default" key/);
  assert.throws(() => defaultSecretKey('["sb_secret_a"]'), /has no "default" key/);
});
