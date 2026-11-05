import assert from 'node:assert/strict';
import { test } from 'node:test';

import { lineStamps, stampDate } from '../../src/features/studio/panels/use-line-stamps.ts';

test('a stamp reads "5 Nov 2026, 3:42 PM", in Manila time', () => {
  assert.equal(stampDate('2026-11-05T07:42:00Z'), '5 Nov 2026, 3:42 PM');
  assert.equal(stampDate('2026-11-04T16:05:00Z'), '5 Nov 2026, 12:05 AM');
});

test('no time, or one that cannot be read, is none', () => {
  assert.equal(stampDate(null), null);
  assert.equal(stampDate('not a time'), null);
});

const stamp = (fields) => ({
  kind: 'route',
  id: 'r1',
  isPublished: true,
  hasDraft: false,
  authorId: 'a1',
  authorName: 'Marisol',
  publishedAt: '2026-11-02T02:15:00Z',
  lastEditedAt: '2026-11-05T07:42:00Z',
  ...fields,
});

test('the author is named, and the dates are said', () => {
  assert.deepEqual(lineStamps(stamp({})), {
    author: 'Marisol',
    datePublished: '2 Nov 2026, 10:15 AM',
    lastEdited: '5 Nov 2026, 3:42 PM',
  });
});

test('an author with no name on file is "another editor"; with no author, none', () => {
  assert.equal(lineStamps(stamp({ authorName: null })).author, 'another editor');
  assert.equal(lineStamps(stamp({ authorName: null, authorId: null })).author, null);
});

test('with no stamp, every fact is unknown', () => {
  assert.deepEqual(lineStamps(undefined), { author: null, datePublished: null, lastEdited: null });
});
