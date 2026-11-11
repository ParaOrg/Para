// Compares two major-roads files for the monthly refresh's pull request (.scratch/go-here, ticket
// 05): roads, named ones and their kilometres, before and after. A rebuild that lost more than
// SHRINK_LIMIT of its roads fails before any pull request is opened (a broken extract or filter),
// unless ALLOW_SHRINK=1, as the landmark and footbridge comparisons do.
//
// Usage: node scripts/major-roads/compare.mjs <before.json> <after.json>
//   prints a Markdown table; exits 1 when the file shrank too much and ALLOW_SHRINK is not 1.
//   A before file that does not exist yet (the first build) compares as empty.
import { existsSync, readFileSync } from 'node:fs';

import { SHRINK_LIMIT } from '../landmarks/compare.mjs';

const RADIANS = Math.PI / 180;
/** Straight-line metres between two [lng, lat], flat-earth: fine between a line's vertices. */
const metres = ([ax, ay], [bx, by]) =>
  6371000 *
  Math.hypot((bx - ax) * RADIANS * Math.cos(((ay + by) / 2) * RADIANS), (by - ay) * RADIANS);

const kilometresOf = (roads) =>
  Math.round(
    roads
      .flatMap((road) => road.lines)
      .reduce(
        (sum, line) => sum + line.slice(1).reduce((m, v, i) => m + metres(line[i], v), 0),
        0,
      ) / 1000,
  );

const countsOf = (file) => ({
  roads: file.roads.length,
  named: file.roads.filter((road) => road.name).length,
  kilometres: kilometresOf(file.roads),
});

/** The counts before and after, and whether the roads shrank past SHRINK_LIMIT. */
export function compareMajorRoadFiles(before, after) {
  const was = countsOf(before);
  const now = countsOf(after);
  const rows = Object.keys(now).map((what) => ({ what, before: was[what], after: now[what] }));
  return { rows, hasShrunkTooMuch: now.roads < was.roads * (1 - SHRINK_LIMIT) };
}

const change = (before, after) => {
  const difference = after - before;
  return difference > 0 ? `+${difference}` : `${difference}`;
};

/** The comparison as a Markdown table, a row per count. */
export function majorRoadTable({ rows }) {
  return [
    '| Major roads | Before | After | Change |',
    '| --- | ---: | ---: | ---: |',
    ...rows.map(
      ({ what, before, after }) => `| ${what} | ${before} | ${after} | ${change(before, after)} |`,
    ),
  ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [beforePath, afterPath] = process.argv.slice(2);
  if (!beforePath || !afterPath) {
    console.error('Usage: node scripts/major-roads/compare.mjs <before.json> <after.json>');
    process.exit(2);
  }
  const read = (path) =>
    existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { roads: [] };
  const comparison = compareMajorRoadFiles(read(beforePath), read(afterPath));
  console.log(majorRoadTable(comparison));
  if (comparison.hasShrunkTooMuch && process.env.ALLOW_SHRINK !== '1') {
    console.error(
      `The major-roads file shrank by more than ${SHRINK_LIMIT * 100}%: a broken extract or ` +
        'filter, most likely. Run the workflow again with "allow shrink" ticked if it is real.',
    );
    process.exit(1);
  }
}
