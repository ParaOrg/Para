// The monthly landmark refresh's comparison (scripts/landmarks/compare.mjs): each kind's count
// before and after for its pull request, a refusal when the file lost more than 20%, and the new
// ground a wider extract adds.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/landmark-compare-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHRINK_LIMIT,
  compareLandmarkFiles,
  comparisonTable,
  newGround,
  newGroundText,
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

test('new ground: the landmarks farther than 2 km from every landmark before, the known kinds by name', () => {
  const at = (name, kind, point) => ({ id: `n${name.length}`, name, kind, point });
  const before = { landmarks: [at('Gateway', 'mall', [121.053, 14.62])] };
  const after = {
    landmarks: [
      at('Gateway', 'mall', [121.053, 14.62]),
      at('Farmers Plaza', 'mall', [121.0525, 14.6185]), // 170 m away: old ground
      at('SM Masinag', 'mall', [121.1636, 14.6253]), // Antipolo, 12 km east
      at('San Isidro', 'barangay', [121.17, 14.63]),
    ],
  };
  const ground = newGround(before, after);
  assert.deepEqual(
    ground.map(({ name }) => name),
    ['SM Masinag', 'San Isidro'],
  );
  const text = newGroundText(ground);
  assert.match(text, /^2 landmarks lie more than 2 km/);
  assert.match(text, /- SM Masinag \(mall, 14\.6253, 121\.1636\)/);
  assert.doesNotMatch(text, /San Isidro/, 'a barangay is counted, not listed');
  assert.equal(newGroundText([]), 'No landmark lies on new ground.');
});
