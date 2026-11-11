// Compares two footbridge files for the monthly refresh's pull request (.scratch/footbridges,
// ticket 01): footbridges, named ones and elevators, before and after. A rebuild that lost more
// than SHRINK_LIMIT of its footbridges fails before any pull request is opened (a broken extract
// or filter), unless ALLOW_SHRINK=1, as the landmark file's comparison does.
//
// Usage: node scripts/footbridges/compare.mjs <before.json> <after.json>
//   prints a Markdown table; exits 1 when the file shrank too much and ALLOW_SHRINK is not 1.
//   A before file that does not exist yet (the first build) compares as empty.
import { existsSync, readFileSync } from 'node:fs';

import { SHRINK_LIMIT } from '../landmarks/compare.mjs';

const countsOf = (file) => ({
  footbridges: file.footbridges.length,
  named: file.footbridges.filter((footbridge) => footbridge.name).length,
  elevators: file.footbridges
    .flatMap((footbridge) => footbridge.access ?? [])
    .filter((point) => point.kind === 'elevator').length,
});

/** The counts before and after, and whether the footbridges shrank past SHRINK_LIMIT. */
export function compareFootbridgeFiles(before, after) {
  const was = countsOf(before);
  const now = countsOf(after);
  const rows = Object.keys(now).map((what) => ({ what, before: was[what], after: now[what] }));
  return {
    rows,
    hasShrunkTooMuch: now.footbridges < was.footbridges * (1 - SHRINK_LIMIT),
  };
}

const change = (before, after) => {
  const difference = after - before;
  return difference > 0 ? `+${difference}` : `${difference}`;
};

/** The comparison as a Markdown table, a row per count. */
export function footbridgeTable({ rows }) {
  return [
    '| Footbridges | Before | After | Change |',
    '| --- | ---: | ---: | ---: |',
    ...rows.map(
      ({ what, before, after }) => `| ${what} | ${before} | ${after} | ${change(before, after)} |`,
    ),
  ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [beforePath, afterPath] = process.argv.slice(2);
  if (!beforePath || !afterPath) {
    console.error('Usage: node scripts/footbridges/compare.mjs <before.json> <after.json>');
    process.exit(2);
  }
  const read = (path) =>
    existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { footbridges: [] };
  const comparison = compareFootbridgeFiles(read(beforePath), read(afterPath));
  console.log(footbridgeTable(comparison));
  if (comparison.hasShrunkTooMuch && process.env.ALLOW_SHRINK !== '1') {
    console.error(
      `The footbridge file shrank by more than ${SHRINK_LIMIT * 100}%: a broken extract or ` +
        'filter, most likely. Run the workflow again with "allow shrink" ticked if it is real.',
    );
    process.exit(1);
  }
}
