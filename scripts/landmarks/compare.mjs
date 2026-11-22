// Compares two landmark files kind by kind: the monthly refresh's pull request shows the table,
// and a rebuild that lost more than SHRINK_LIMIT of its landmarks fails before any pull request
// is opened (a broken extract or filter, not Manila losing its schools), unless ALLOW_SHRINK=1.
//
// Usage: node scripts/landmarks/compare.mjs <before.json> <after.json>
//   prints a Markdown table and the new ground (newGround); exits 1 when the file shrank too much
//   and ALLOW_SHRINK is not 1.
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

/** How far a landmark lies from every landmark of the file before to count as new ground. */
export const NEW_GROUND_M = 2000;
/** The kinds a reader knows a town by, listed by name when they are on new ground. */
const NEW_GROUND_KINDS = ['mall', 'university', 'hospital', 'station', 'market'];
const CELL_DEG = 0.02;

const metres = ([lng1, lat1], [lng2, lat2]) => {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
};

/**
 * The landmarks that lie farther than NEW_GROUND_M from every landmark of the file before: the
 * ground a wider extract added (the provinces past Metro Manila's line), or a place newly mapped
 * far from any other. A grid of the old points keeps it quick.
 */
export function newGround(before, after) {
  const cell = ([lng, lat]) => `${Math.floor(lng / CELL_DEG)},${Math.floor(lat / CELL_DEG)}`;
  const grid = new Map();
  for (const { point } of before.landmarks)
    grid.set(cell(point), [...(grid.get(cell(point)) ?? []), point]);
  const reach = Math.ceil(NEW_GROUND_M / 111000 / CELL_DEG);
  const isNear = ([lng, lat]) => {
    const [x, y] = [Math.floor(lng / CELL_DEG), Math.floor(lat / CELL_DEG)];
    for (let dx = -reach; dx <= reach; dx++)
      for (let dy = -reach; dy <= reach; dy++)
        for (const old of grid.get(`${x + dx},${y + dy}`) ?? [])
          if (metres(old, [lng, lat]) <= NEW_GROUND_M) return true;
    return false;
  };
  return after.landmarks.filter(({ point }) => !isNear(point));
}

/** New ground as Markdown: how many landmarks, and the ones a reader knows a town by, by name. */
export function newGroundText(landmarks, shown = 25) {
  if (landmarks.length === 0) return 'No landmark lies on new ground.';
  const named = landmarks
    .filter(({ kind }) => NEW_GROUND_KINDS.includes(kind))
    .sort((a, b) => NEW_GROUND_KINDS.indexOf(a.kind) - NEW_GROUND_KINDS.indexOf(b.kind));
  const list = named
    .slice(0, shown)
    .map(({ name, kind, point }) => `- ${name} (${kind}, ${point[1]}, ${point[0]})`);
  return [
    `${landmarks.length} landmarks lie more than ${NEW_GROUND_M / 1000} km from every landmark before, ${named.length} of them ${NEW_GROUND_KINDS.join(', ')}:`,
    '',
    ...list,
    ...(named.length > shown ? [`- and ${named.length - shown} more`] : []),
  ].join('\n');
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
  console.log(`\n${newGroundText(newGround(read(beforePath), read(afterPath)))}`);
  if (comparison.hasShrunkTooMuch && process.env.ALLOW_SHRINK !== '1') {
    console.error(
      `The landmark file shrank from ${comparison.totalBefore} to ${comparison.totalAfter}, ` +
        `more than ${SHRINK_LIMIT * 100}%: a broken extract or filter, most likely. ` +
        'Run the workflow again with "allow shrink" ticked if it is real.',
    );
    process.exit(1);
  }
}
