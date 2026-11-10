// The monthly landmark refresh's comparison (scripts/landmarks/compare.mjs): each kind's count
// before and after for its pull request, and a refusal when the file lost more than 20%.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/landmark-compare-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHRINK_LIMIT,
  compareLandmarkFiles,
  comparisonTable,
} from '../../scripts/landmarks/compare.mjs';

const file = (counts, kinds = Object.keys(counts)) => ({
  kinds,
  landmarks: Object.entries(counts).flatMap(([kind, n]) =>
    Array.from({ length: n }, (_, i) => ({ id: `n${i}`, kind })),
  ),
});

test('each kind is counted before and after, in the new file order, with kinds gone kept', () => {
  const comparison = compareLandmarkFiles(
    file({ mall: 10, church: 5 }),
    file({ mall: 12, worship: 7 }, ['mall', 'worship']),
  );
  assert.deepEqual(comparison.rows, [
    { kind: 'mall', before: 10, after: 12 },
    { kind: 'worship', before: 0, after: 7 },
    { kind: 'church', before: 5, after: 0 },
  ]);
  assert.equal(comparison.totalBefore, 15);
  assert.equal(comparison.totalAfter, 19);
  assert.equal(comparison.hasShrunkTooMuch, false);
});

test('a file that lost more than 20% is refused; 20% exactly is not', () => {
  assert.equal(SHRINK_LIMIT, 0.2);
  assert.equal(
    compareLandmarkFiles(file({ mall: 100 }), file({ mall: 79 })).hasShrunkTooMuch,
    true,
  );
  assert.equal(
    compareLandmarkFiles(file({ mall: 100 }), file({ mall: 80 })).hasShrunkTooMuch,
    false,
  );
});

test('the table shows each change with its sign, 0 where a kind held', () => {
  const table = comparisonTable(
    compareLandmarkFiles(file({ mall: 10, school: 4 }), file({ mall: 8, school: 4 })),
  );
  assert.match(table, /^\| Kind \| Before \| After \| Change \|$/m);
  assert.match(table, /^\| mall \| 10 \| 8 \| -2 \|$/m);
  assert.match(table, /^\| school \| 4 \| 4 \| 0 \|$/m);
  assert.match(table, /^\| \*\*All\*\* \| \*\*14\*\* \| \*\*12\*\* \| \*\*-2\*\* \|$/m);
});
