// The studio's direction list (src/features/studio/data/live.ts, listDirections)
// is paged by id, which never changes, and put back in the order the map
// stacks it: most recently changed first, then by id.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/direction-order-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { byRecentChange } from '../../src/features/studio/data/live.ts';

const row = (id, updated_at) => ({ id, updated_at });

test('newest change first, ties by id', () => {
  const rows = [
    row('b', '2026-10-20T00:00:00+00:00'),
    row('a', '2026-10-21T00:00:00+00:00'),
    row('d', '2026-10-20T00:00:00+00:00'),
    row('c', '2026-10-20T00:00:00+00:00'),
  ];
  assert.deepEqual(
    rows.sort(byRecentChange).map((r) => r.id),
    ['a', 'b', 'c', 'd'],
  );
});

test('times compared as times, not as text: fractions of a second of any length', () => {
  // Postgres drops trailing zeros, so ".5" is later than ".123" though it sorts first as text.
  const rows = [row('x', '2026-10-20T00:00:00.123+00:00'), row('y', '2026-10-20T00:00:00.5+00:00')];
  assert.deepEqual(
    rows.sort(byRecentChange).map((r) => r.id),
    ['y', 'x'],
  );
});
