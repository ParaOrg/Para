// How a duration token is read (src/shared/utils/css-duration.ts): in milliseconds, whether the CSS says ms, as tokens.css does, or s, as a production build's
// minified CSS does. Read as ms, `.39s` was a 0.39 ms animation: the pill jumped.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/css-duration-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cssDurationMs } from '../../src/shared/utils/css-duration.ts';

test('milliseconds, as tokens.css writes them', () => {
  assert.equal(cssDurationMs('390ms'), 390);
  assert.equal(cssDurationMs(' 195ms '), 195);
});

test('seconds, as a minified build writes them, are the same milliseconds', () => {
  assert.equal(cssDurationMs('0.39s'), 390);
  assert.equal(cssDurationMs('.39s'), 390);
  assert.equal(cssDurationMs('.195s'), 195);
  assert.equal(cssDurationMs('0s'), 0);
});

test('anything else is not a duration', () => {
  assert.equal(cssDurationMs(''), null);
  assert.equal(cssDurationMs('390'), null);
  assert.equal(cssDurationMs('fast'), null);
  assert.equal(cssDurationMs('1.2.3s'), null);
});
