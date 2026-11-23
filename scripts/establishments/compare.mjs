// Compares two builds of the establishment files, kind by kind and cell by cell, for the monthly
// refresh's pull request. A cell that lost more than half its places is flagged, a sign of a
// broken extract in that area; a build that lost more than SHRINK_LIMIT of all its places fails
// before any pull request is opened, unless ALLOW_SHRINK=1, as the landmark file's does.
//
// Usage: node --experimental-strip-types scripts/establishments/compare.mjs <before dir> <after dir> [title]
//   the title heads the table, "Establishments" unless given (the Overture files pass theirs)
//   a missing before dir reads as no establishments at all (the first build)
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { SHRINK_LIMIT } from '../landmarks/compare.mjs';
import { ESTABLISHMENT_INDEX, readEstablishmentFiles } from './establishment-file.mjs';

/** A cell with at least this many places before is flagged when it loses more than half. */
const FLAG_FROM = 50;

/** Each kind's count and each cell's, read from the files. */
export function countsOf({ index, cells }) {
  const byKind = new Map();
  const byCell = new Map();
  for (const { cell } of JSON.parse(index).cells) {
    const { establishments } = JSON.parse(cells.get(cell));
    byCell.set(cell, establishments.length);
    for (const [, kind] of establishments) byKind.set(kind, (byKind.get(kind) ?? 0) + 1);
  }
  return { byKind, byCell };
}

const EMPTY = { byKind: new Map(), byCell: new Map() };
const sum = (map) => [...map.values()].reduce((total, n) => total + n, 0);
const change = (before, after) => (after - before > 0 ? `+${after - before}` : `${after - before}`);

/** The comparison: by kind, the cells that lost more than half, and whether the whole shrank too much. */
export function compareEstablishments(before, after, kinds) {
  const rows = kinds.map((kind) => ({
    kind,
    before: before.byKind.get(kind) ?? 0,
    after: after.byKind.get(kind) ?? 0,
  }));
  const halved = [...before.byCell]
    .filter(([cell, n]) => n >= FLAG_FROM && (after.byCell.get(cell) ?? 0) < n / 2)
    .map(([cell, n]) => ({ cell, before: n, after: after.byCell.get(cell) ?? 0 }));
  const totalBefore = sum(before.byKind);
  const totalAfter = sum(after.byKind);
  return {
    rows,
    halved,
    totalBefore,
    totalAfter,
    cellsBefore: before.byCell.size,
    cellsAfter: after.byCell.size,
    hasShrunkTooMuch: totalAfter < totalBefore * (1 - SHRINK_LIMIT),
  };
}

/** The comparison as Markdown: a table by kind, the cells, and any cell flagged. */
export function comparisonText(
  { rows, halved, totalBefore, totalAfter, cellsBefore, cellsAfter },
  title = 'Establishments',
) {
  return [
    `| ${title} | Before | After | Change |`,
    '| --- | ---: | ---: | ---: |',
    ...rows.map(
      ({ kind, before, after }) => `| ${kind} | ${before} | ${after} | ${change(before, after)} |`,
    ),
    `| **All** | **${totalBefore}** | **${totalAfter}** | **${change(totalBefore, totalAfter)}** |`,
    '',
    `Cells: ${cellsBefore} before, ${cellsAfter} after.`,
    ...(halved.length === 0
      ? ['No cell lost more than half its places.']
      : [
          `**${halved.length} cells lost more than half their places**, a sign of a broken extract there:`,
          ...halved.map(({ cell, before, after }) => `- ${cell}: ${before} → ${after}`),
        ]),
  ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [beforeDir, afterDir, title] = process.argv.slice(2);
  if (!beforeDir || !afterDir) {
    console.error('Usage: compare.mjs <before dir> <after dir>');
    process.exit(2);
  }
  const after = readEstablishmentFiles(afterDir);
  const hasBefore = existsSync(join(beforeDir, ESTABLISHMENT_INDEX));
  const comparison = compareEstablishments(
    hasBefore ? countsOf(readEstablishmentFiles(beforeDir)) : EMPTY,
    countsOf(after),
    JSON.parse(after.index).kinds,
  );
  console.log(comparisonText(comparison, title));
  if (comparison.hasShrunkTooMuch && process.env.ALLOW_SHRINK !== '1') {
    console.error(
      `${title ?? 'The establishments'} shrank from ${comparison.totalBefore} to ${comparison.totalAfter}, more than ` +
        `${SHRINK_LIMIT * 100}%: a broken extract or filter, most likely. Run the workflow again with ` +
        '"allow shrink" ticked if it is real.',
    );
    process.exit(1);
  }
}
