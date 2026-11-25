/*
 * The typo count place search's matching rests on (place-search.ts' matchFolded, and the studio's
 * store search): one table per name, its rows reused, as a search runs it over a hundred thousand.
 */

const SPACE = ' '.charCodeAt(0);

/** typosToWordStart's three rows, grown to the longest name yet. */
let typoRows: [Int32Array, Int32Array, Int32Array] = [
  new Int32Array(64),
  new Int32Array(64),
  new Int32Array(64),
];

/**
 * The fewest edits (insert, delete, change, swap two neighbours) between the query and a stretch
 * of the name that starts at a word's start, any length; limit + 1 once past it. One table over
 * the whole name: row 0 costs the letters skipped since the last word's start, and the last row's
 * smallest cell is the best stretch's end.
 */
export function typosToWordStart(query: string, name: string, limit: number): number {
  const width = name.length + 1;
  // The three rows, reused across calls: a search over a hundred thousand names allocates none.
  if (typoRows[0].length < width)
    typoRows = [new Int32Array(width * 2), new Int32Array(width * 2), new Int32Array(width * 2)];
  let [twoBack, previous, current] = typoRows;
  let sinceWordStart = 0;
  for (let j = 0; j < width; j++) {
    previous[j] = sinceWordStart;
    sinceWordStart = name.charCodeAt(j) === SPACE ? 0 : sinceWordStart + 1;
  }
  for (let i = 1; i <= query.length; i++) {
    const letter = query.charCodeAt(i - 1);
    const letterBefore = i > 1 ? query.charCodeAt(i - 2) : -1;
    current[0] = i;
    let rowBest = i;
    for (let j = 1; j < width; j++) {
      const nameLetter = name.charCodeAt(j - 1);
      let value = previous[j - 1] + (letter === nameLetter ? 0 : 1);
      if (previous[j] + 1 < value) value = previous[j] + 1;
      if (current[j - 1] + 1 < value) value = current[j - 1] + 1;
      // A swap of two neighbours: one edit.
      if (j > 1 && letterBefore === nameLetter && letter === name.charCodeAt(j - 2)) {
        if (twoBack[j - 2] + 1 < value) value = twoBack[j - 2] + 1;
      }
      current[j] = value;
      if (value < rowBest) rowBest = value;
    }
    if (rowBest > limit) return limit + 1;
    const spent = twoBack;
    twoBack = previous;
    previous = current;
    current = spent;
  }
  let best = previous[0];
  for (let j = 1; j < width; j++) if (previous[j] < best) best = previous[j];
  return best;
}
