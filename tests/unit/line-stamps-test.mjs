import assert from 'node:assert/strict';
import { test } from 'node:test';

import { stampDate } from '../../src/features/studio/panels/use-line-stamps.ts';

test('a stamp reads as the owner chose, in Manila time', () => {
  assert.equal(stampDate('2026-11-05T07:42:00Z'), '5 Nov 2026, 3:42 PM');
  assert.equal(stampDate('2026-11-04T16:05:00Z'), '5 Nov 2026, 12:05 AM');
});

test('no time, or one that cannot be read, is none', () => {
  assert.equal(stampDate(null), null);
  assert.equal(stampDate('not a time'), null);
});
