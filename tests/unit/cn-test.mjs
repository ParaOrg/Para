// How class names are joined (src/shared/utils/cn.ts): with one space, leaving
// out false, null and undefined, so a condition can sit in the list.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/cn-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cn } from '../../src/shared/utils/cn.ts';

test('class names are joined with one space', () => {
  assert.equal(cn('rounded-lg', 'p-4', 'text-left'), 'rounded-lg p-4 text-left');
});

test('false, null and undefined are left out', () => {
  assert.equal(cn('p-4', false, null, undefined, 'text-left'), 'p-4 text-left');
});

test('a condition adds its class when true and nothing when false', () => {
  for (const isOn of [true, false]) {
    assert.equal(cn('p-4', isOn && 'bg-brand'), isOn ? 'p-4 bg-brand' : 'p-4');
  }
});

test('no class names give an empty string', () => {
  assert.equal(cn(), '');
});
