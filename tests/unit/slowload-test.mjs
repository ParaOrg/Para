// The contributor page's ?slowload test switch (src/features/contribute/common/slowload.ts): how
// long it holds History's and Account's loads back, read from the address or kept for the session.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/slowload-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slowloadDelayMs } from '../../src/features/contribute/common/slowload.ts';

test('?slowload alone holds the loads back 2 s', () => {
  assert.equal(slowloadDelayMs('?slowload', null), 2000);
  assert.equal(slowloadDelayMs('?slowload=', null), 2000);
  assert.equal(slowloadDelayMs('?slowload=yes', null), 2000);
});

test('?slowload=N holds them N seconds, kept between 1 and 10', () => {
  assert.equal(slowloadDelayMs('?slowload=5', null), 5000);
  assert.equal(slowloadDelayMs('?slowload=1.5', null), 1500);
  assert.equal(slowloadDelayMs('?slowload=60', null), 10000);
  assert.equal(slowloadDelayMs('?slowload=0', null), 1000);
});

test('with no ?slowload and nothing kept, nothing is held back', () => {
  assert.equal(slowloadDelayMs('', null), 0);
  assert.equal(slowloadDelayMs('?slowmo', null), 0);
});

test('with no ?slowload, the delay kept for the session holds', () => {
  assert.equal(slowloadDelayMs('', '3000'), 3000);
  assert.equal(slowloadDelayMs('', '99000'), 10000);
});

test('?slowload=off turns it off, whatever was kept', () => {
  assert.equal(slowloadDelayMs('?slowload=off', '3000'), 0);
  assert.equal(slowloadDelayMs('?slowload=OFF', null), 0);
});
