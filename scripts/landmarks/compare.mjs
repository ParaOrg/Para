// Compares two landmark files kind by kind: the monthly refresh's pull request shows the table,
// and a rebuild that lost more than SHRINK_LIMIT of its landmarks fails before any pull request
// is opened (a broken extract or filter, not Manila losing its schools), unless ALLOW_SHRINK=1.
//
// Usage: node scripts/landmarks/compare.mjs <before.json> <after.json>
//   prints a Markdown table; exits 1 when the file shrank too much and ALLOW_SHRINK is not 1.
import { readFileSync } from 'node:fs';

/** The share of its landmarks a rebuild may lose before it is refused. */
export const SHRINK_LIMIT = 0.2;

const countByKind = (file) => {
  const counts = new Map();
  for (const { kind } of file.landmarks) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  return counts;
};

/** Each kind's count before and after, in the after file's order, then kinds gone; the totals. */
export function compareLandmarkFiles(before, after) {
  const was = countByKind(before);
  const now = countByKind(after);
  const kinds = [...new Set([...(after.kinds ?? []), ...now.keys(), ...was.keys()])];
  const rows = kinds.map((kind) => ({
    kind,
    before: was.get(kind) ?? 0,
    after: now.get(kind) ?? 0,
  }));
  const totalBefore = before.landmarks.length;
  const totalAfter = after.landmarks.length;
  return {
    rows,
    totalBefore,
    totalAfter,
    hasShrunkTooMuch: totalAfter < totalBefore * (1 - SHRINK_LIMIT),
  };
}

const change = (before, after) => {
  const difference = after - before;
  return difference > 0 ? `+${difference}` : `${difference}`;
};

/** The comparison as a Markdown table, a row per kind and a total. */
export function comparisonTable({ rows, totalBefore, totalAfter }) {
  const lines = [
    '| Kind | Before | After | Change |',
    '| --- | ---: | ---: | ---: |',
    ...rows.map(
      ({ kind, before, after }) => `| ${kind} | ${before} | ${after} | ${change(before, after)} |`,
    ),
    `| **All** | **${totalBefore}** | **${totalAfter}** | **${change(totalBefore, totalAfter)}** |`,
  ];
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [beforePath, afterPath] = process.argv.slice(2);
  if (!beforePath || !afterPath) {
    console.error('Usage: node scripts/landmarks/compare.mjs <before.json> <after.json>');
    process.exit(2);
  }
  const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
  const comparison = compareLandmarkFiles(read(beforePath), read(afterPath));
  console.log(comparisonTable(comparison));
  if (comparison.hasShrunkTooMuch && process.env.ALLOW_SHRINK !== '1') {
    console.error(
      `The landmark file shrank from ${comparison.totalBefore} to ${comparison.totalAfter}, ` +
        `more than ${SHRINK_LIMIT * 100}%: a broken extract or filter, most likely. ` +
        'Run the workflow again with "allow shrink" ticked if it is real.',
    );
    process.exit(1);
  }
}
