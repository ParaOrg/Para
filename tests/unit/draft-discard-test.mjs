import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  OTHER_EDITOR_DISCARD_DAYS,
  discardWaitMessage,
  discardableFrom,
  otherDiscardOf,
} from '../../src/features/studio/data/draft-discard.ts';

const DAY = 24 * 60 * 60 * 1000;
const CHANGED = '2026-11-28T10:00:00+00:00';
const changedMs = new Date(CHANGED).getTime();
const draft = (editor_id, updated_at = CHANGED) => ({ editor_id, updated_at });

test('the draft can be discarded 7 days after its last change', () => {
  assert.equal(OTHER_EDITOR_DISCARD_DAYS, 7);
  assert.equal(discardableFrom(CHANGED).toISOString(), '2026-12-05T10:00:00.000Z');
});

test("another editor's draft waits until 7 days have passed, to the millisecond", () => {
  const from = discardableFrom(CHANGED);
  const justBefore = new Date(changedMs + 7 * DAY - 1);
  assert.deepEqual(otherDiscardOf(draft('a'), 'b', new Date(changedMs)), { state: 'wait', from });
  assert.deepEqual(otherDiscardOf(draft('a'), 'b', justBefore), { state: 'wait', from });
  assert.deepEqual(otherDiscardOf(draft('a'), 'b', from), { state: 'ready' });
  assert.deepEqual(otherDiscardOf(draft('a'), 'b', new Date(changedMs + 30 * DAY)), {
    state: 'ready',
  });
});

test("an editor's own draft, and a maker-less one, are the usual Discard's, at any age", () => {
  const now = new Date(changedMs);
  assert.equal(otherDiscardOf(draft('a'), 'a', now), null);
  assert.equal(otherDiscardOf(draft(null), 'a', now), null);
});

test('a stamp that cannot be read waits, and says so without a date', () => {
  const unreadable = otherDiscardOf(draft('a', 'not a date'), 'b', new Date(changedMs + 30 * DAY));
  assert.deepEqual(unreadable, { state: 'wait', from: null });
  assert.equal(
    discardWaitMessage(null),
    'You can discard this once it has gone 7 days without a change.',
  );
});

test('the line names the day it opens, in the given time zone', () => {
  const from = discardableFrom(CHANGED);
  assert.equal(
    discardWaitMessage(from, 'UTC'),
    "You can discard this from 5 Dec if it isn't changed.",
  );
  // 10:00 UTC on the 5th is already the 5th in Manila (UTC+8), and 02:00 on the 5th in New York is the 5th too.
  assert.equal(discardWaitMessage(from, 'Asia/Manila'), discardWaitMessage(from, 'UTC'));
  assert.equal(
    discardWaitMessage(new Date('2026-12-05T20:00:00Z'), 'Asia/Manila'),
    "You can discard this from 6 Dec if it isn't changed.",
  );
});
