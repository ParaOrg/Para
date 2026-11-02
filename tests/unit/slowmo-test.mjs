// The contributor page's ?slowmo test switch (src/features/contribute/motion/slowmo.ts): the factor
// it slows the motion by, read from the address or kept for the session.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/slowmo-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slowedDuration, slowmoFactor } from '../../src/features/contribute/motion/slowmo.ts';

test('?slowmo alone slows by 5', () => {
  assert.equal(slowmoFactor('?slowmo', null), 5);
  assert.equal(slowmoFactor('?slowmo=', null), 5);
});

test('?slowmo=N slows by N, kept between 1 and 10', () => {
  assert.equal(slowmoFactor('?slowmo=3', null), 3);
  assert.equal(slowmoFactor('?slowmo=2.5', null), 2.5);
  assert.equal(slowmoFactor('?slowmo=40', null), 10);
  assert.equal(slowmoFactor('?slowmo=0', null), 1);
  assert.equal(slowmoFactor('?slowmo=-2', null), 1);
});

test('a value that is not a number slows by the default 5', () => {
  assert.equal(slowmoFactor('?slowmo=yes', null), 5);
});

test('with no ?slowmo and nothing kept, nothing is slowed', () => {
  assert.equal(slowmoFactor('', null), null);
  assert.equal(slowmoFactor('?other=1', null), null);
});

test('with no ?slowmo, the factor kept for the session holds', () => {
  assert.equal(slowmoFactor('', '4'), 4);
  assert.equal(slowmoFactor('', '99'), 10);
});

test('?slowmo=off turns it off, whatever was kept', () => {
  assert.equal(slowmoFactor('?slowmo=off', '4'), null);
  assert.equal(slowmoFactor('?slowmo=OFF', null), null);
});

test('the address wins over what was kept', () => {
  assert.equal(slowmoFactor('?slowmo=2', '8'), 2);
});

test('a duration is slowed in its own unit: seconds, as a build writes them, and milliseconds', () => {
  assert.equal(slowedDuration('0.3s', 5), '1500ms');
  assert.equal(slowedDuration(' 300ms', 5), '1500ms');
  assert.equal(slowedDuration('.2s', 10), '2000ms');
  assert.equal(slowedDuration('0s', 5), '0ms');
});

test('a value that is not a duration is left as it is', () => {
  assert.equal(slowedDuration('', 5), null);
  assert.equal(slowedDuration('fast', 5), null);
  assert.equal(slowedDuration('300', 5), null);
});
