// Which signboards the map publishes: each direction's boards, in its order,
// as files (0010, the owner's ask of 2026-10-01). One the bucket no longer
// holds is left out, said, and the rest still publish; a name not the studio's
// is never asked for. Reading the bucket is read-database.mjs's.

/** A board's name in the bucket, as the studio writes it (signboards.ts): a uuid. Anything else is not read. */
export const BOARD_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.svg$/;

/** Every board the directions name, once each in the order first named, and each direction's own. */
export function boardsNamed(directionRows) {
  const names = new Set();
  const boardsOf = new Map();
  for (const v of directionRows) {
    const own = (Array.isArray(v.signboards) ? v.signboards : []).filter((n) => BOARD_NAME.test(n));
    for (const n of own) names.add(n);
    if (own.length) boardsOf.set(v.id, own);
  }
  return { names: [...names], boardsOf };
}

/**
 * Sorts what the bucket answered for each name (`fetched`, in the order
 * named): the text of each board kept (null for one left out), the boards the
 * clean refused with why, the boards gone from the bucket, each direction's
 * boards that are kept, and how many a direction named but lost.
 */
export function sortBoards(fetched, boardsOf) {
  const boardText = new Map(fetched);
  const refused = [...boardText].filter(([, t]) => t?.refused).map(([n, t]) => [n, t.refused]);
  for (const [n] of refused) boardText.set(n, null);
  // A board the bucket answers 400 or 404 for is gone, and left out: said
  // one by one, as a refused one is. Many boards gone at once is far more
  // likely a bucket made private than a clear-out (a board taken off in the
  // studio is unlisted first, so it is not named), and the files would then
  // be deleted from the map: refused unless told, as a shrunk map is
  // (review of 2026-10-03, finding 8; board-guard.mjs).
  const gone = [...boardText]
    .filter(([n, t]) => t === null && !refused.some(([r]) => r === n))
    .map(([n]) => n);
  const kept = new Map();
  let missing = 0;
  for (const [id, names] of boardsOf) {
    const found = names.filter((n) => boardText.get(n) !== null);
    missing += names.length - found.length;
    if (found.length) kept.set(id, found);
  }
  return { boardText, refused, gone, boardsOf: kept, missing };
}
