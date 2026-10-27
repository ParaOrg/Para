// Where a trip card's rail runs (src/features/routes/cards/timeline-rail.ts):
// along the ride and along the rows outside it, broken where the ride starts
// and ends, and never beside a fold's row next to the ride, open or closed
// (the owner, 2026-10-16: "when close it should disconnect the disclosure",
// Figma 4194:12562, 4194:12702 and 4189:11483). The card itself renders its
// folds closed on the server (timeline-route-detail-test); the open folds
// are read here, and in phone-test.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/timeline-rail-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { timelineFolds } from '../../src/features/routes/cards/timeline-folds.ts';
import { timelineRail } from '../../src/features/routes/cards/timeline-rail.ts';
import { rideRows } from '../../src/features/routes/model/ride-rows.ts';

// A train's ten stations between Antipolo and Recto, as his frames draw them.
const STATIONS = [
  'Marikina-Pasig',
  'Santolan',
  'Katipunan',
  'Anonas',
  'Betty Go - Belmonte',
  'Gilmore',
  'J. Ruiz',
  'V. Mapa',
  'Pureza',
  'Legarda',
];
const rows = STATIONS.map((id) => ({ id }));
const ids = STATIONS;

/**
 * The rail for a pick, its folds open as `open` says, read as the card lays
 * it: 'origin', each row's piece (through, above, below, alone), each fold's
 * row ('fold:rail' or 'fold:none') after its last row, and 'destination'
 * with the rail reaching it or not.
 */
const railFor = ({ start = null, end = null, endRow = null, open = {} }) => {
  const folds = timelineFolds(rows, start, end, endRow);
  const lone = start !== null && end === null && endRow === null ? ids.indexOf(start) : -1;
  const ride =
    rideRows(rows, start, end, endRow) ??
    (lone >= 0 ? { first: lone, last: lone } : { first: -1, last: ids.length });
  const rail = timelineRail(ids, ride, folds, (part) => open[part] ?? false);
  const piece = ({ hasAbove, hasBelow }) => {
    if (hasAbove && hasBelow) return 'through';
    if (hasAbove) return 'above';
    if (hasBelow) return 'below';
    return 'alone';
  };
  const laid = [rail.originHasBelow ? 'origin:below' : 'origin:alone'];
  ids.forEach((id, i) => {
    laid.push(`${id}:${piece(rail.rows[i])}`);
    const fold = folds.find((f) => f.rowIds.at(-1) === id);
    if (fold) laid.push(`fold-${fold.part}:${rail.foldHasRail(fold.part) ? 'rail' : 'none'}`);
  });
  laid.push(rail.destinationHasAbove ? 'destination:above' : 'destination:alone');
  return laid;
};

test('nothing picked: the `all` fold is inside the ride and carries the rail, closed or open', () => {
  const allClosed = railFor({});
  assert.equal(allClosed[0], 'origin:below');
  assert.ok(allClosed.includes('fold-all:rail'));
  assert.equal(allClosed.at(-1), 'destination:above');
  assert.deepEqual(railFor({ open: { all: true } }), [
    'origin:below',
    ...ids.map((id) => `${id}:through`),
    'fold-all:rail',
    'destination:above',
  ]);
});

// 4194:12562: E at V. Mapa, no start, the two stations after it folded.
test('an end alone, its after-fold closed (4194:12562): no rail beside the fold, the destination its dot alone', () => {
  assert.deepEqual(railFor({ end: 'V. Mapa' }), [
    'origin:below',
    ...ids.slice(0, 7).map((id) => `${id}:through`),
    'V. Mapa:above',
    // Folded away, they wear the rail they wear open.
    'Pureza:below',
    'Legarda:through',
    'fold-after:none',
    'destination:alone',
  ]);
});

// 4189:11483: the same, the fold open: Pureza → Legarda → View less → Recto.
test('an end alone, its after-fold open (4189:11483): the rail runs from the row after the E through the fold to the destination', () => {
  assert.deepEqual(railFor({ end: 'V. Mapa', open: { after: true } }).slice(-5), [
    'V. Mapa:above',
    'Pureza:below',
    'Legarda:through',
    'fold-after:rail',
    'destination:above',
  ]);
});

// 4194:12702: S Katipunan, E J. Ruiz, both folds open.
test('a start and an end, both folds open (4194:12702): no rail beside the before-fold, the rail through the after-fold', () => {
  assert.deepEqual(
    railFor({ start: 'Katipunan', end: 'J. Ruiz', open: { before: true, after: true } }),
    [
      'origin:below',
      'Marikina-Pasig:through',
      'Santolan:above',
      'fold-before:none',
      'Katipunan:below',
      'Anonas:through',
      'Betty Go - Belmonte:through',
      'Gilmore:through',
      'J. Ruiz:above',
      'V. Mapa:below',
      'Pureza:through',
      'Legarda:through',
      'fold-after:rail',
      'destination:above',
    ],
  );
});

test('a start and an end, both folds closed: the origin and the destination their dots alone, no rail beside either fold', () => {
  const laid = railFor({ start: 'Katipunan', end: 'J. Ruiz' });
  assert.deepEqual(
    laid.filter((x) => /^(origin|fold|destination)/.test(x)),
    ['origin:alone', 'fold-before:none', 'fold-after:none', 'destination:alone'],
  );
  assert.ok(laid.includes('Katipunan:below') && laid.includes('J. Ruiz:above'));
});

test('the before-fold open, the after-fold closed: the rail down to the row above the fold, none beside either fold', () => {
  const laid = railFor({ start: 'Katipunan', end: 'J. Ruiz', open: { before: true } });
  assert.deepEqual(laid.slice(0, 5), [
    'origin:below',
    'Marikina-Pasig:through',
    'Santolan:above',
    'fold-before:none',
    'Katipunan:below',
  ]);
  assert.deepEqual(laid.slice(-2), ['fold-after:none', 'destination:alone']);
});

// Variant3, 4148:12161: a start alone is a ride of its one row.
test('a start alone: the rows above it open and railed, its after-fold by it without, the destination alone until it opens', () => {
  const closed = railFor({ start: 'Anonas' });
  assert.deepEqual(closed.slice(0, 6), [
    'origin:below',
    'Marikina-Pasig:through',
    'Santolan:through',
    'Katipunan:above',
    'Anonas:alone',
    'Betty Go - Belmonte:below',
  ]);
  assert.deepEqual(closed.slice(-2), ['fold-after:none', 'destination:alone']);
  const opened = railFor({ start: 'Anonas', open: { after: true } });
  assert.deepEqual(opened.slice(-3), ['Legarda:through', 'fold-after:rail', 'destination:above']);
});

// "keep the start" (2026-10-16): an end row is the ride's end.
test('the destination as the end with a start: the before-fold by the ride without the rail, open or closed', () => {
  const closed = railFor({ start: 'Gilmore', endRow: 'to' });
  assert.deepEqual(closed.slice(0, 1), ['origin:alone']);
  assert.ok(closed.includes('fold-before:none'));
  assert.equal(closed.at(-1), 'destination:above');
  const opened = railFor({ start: 'Gilmore', endRow: 'to', open: { before: true } });
  assert.equal(opened[0], 'origin:below');
  assert.deepEqual(opened.slice(5, 8), [
    'Betty Go - Belmonte:above',
    'fold-before:none',
    'Gilmore:below',
  ]);
});

test('the origin as the end with a start: the after-fold by the ride without the rail closed, with it open', () => {
  const closed = railFor({ start: 'Gilmore', endRow: 'from' });
  assert.equal(closed[0], 'origin:below');
  assert.ok(closed.includes('Gilmore:above'));
  assert.deepEqual(closed.slice(-2), ['fold-after:none', 'destination:alone']);
  const opened = railFor({ start: 'Gilmore', endRow: 'from', open: { after: true } });
  assert.deepEqual(opened.slice(-7, -1), [
    'Gilmore:above',
    'J. Ruiz:below',
    'V. Mapa:through',
    'Pureza:through',
    'Legarda:through',
    'fold-after:rail',
  ]);
  assert.equal(opened.at(-1), 'destination:above');
});

// ---------------------------------------------------------------- a loop's wrap
// A loop's trip leaves from its tip and comes back to it: the origin and the
// destination are one place, and a ride only goes forward round it, so an end
// above the start wraps. Five rows below the tip: a b c d e.

const LOOP = ['a', 'b', 'c', 'd', 'e'];
const loopRows = LOOP.map((id) => ({ id }));

/** The rail of a loop's trip, laid out as railFor lays a linear one, the start and the end given as row ids. */
const loopRailFor = ({ start = null, end = null, endRow = null, open = {} }) => {
  const folds = timelineFolds(loopRows, start, end, endRow, true);
  const lone = start !== null && end === null && endRow === null ? LOOP.indexOf(start) : -1;
  const ride =
    rideRows(loopRows, start, end, endRow, true) ??
    (lone >= 0 ? { first: lone, last: lone } : { first: -1, last: LOOP.length });
  const rail = timelineRail(LOOP, ride, folds, (part) => open[part] ?? false);
  const piece = ({ hasAbove, hasBelow }) =>
    hasAbove && hasBelow ? 'through' : hasAbove ? 'above' : hasBelow ? 'below' : 'alone';
  const laid = [rail.originHasBelow ? 'origin:below' : 'origin:alone'];
  LOOP.forEach((id, i) => {
    laid.push(`${id}:${piece(rail.rows[i])}`);
    const fold = folds.find((f) => f.rowIds.at(-1) === id);
    if (fold) laid.push(`fold-${fold.part}:${rail.foldHasRail(fold.part) ? 'rail' : 'none'}`);
  });
  laid.push(rail.destinationHasAbove ? 'destination:above' : 'destination:alone');
  return laid;
};

test('a loop with nothing picked runs its rail end to end, as any trip', () => {
  assert.deepEqual(loopRailFor({}), [
    'origin:below',
    'a:through',
    'b:through',
    'c:through',
    'd:through',
    'e:through',
    'fold-all:rail',
    'destination:above',
  ]);
});

test('a wrapped ride: lit from the top to its end, broken, the rows between folded, broken, lit from its start to the bottom', () => {
  // Start at d, end at b (above it): the ride runs d, e, the tip, a, b. c is outside it.
  assert.deepEqual(loopRailFor({ start: 'd', end: 'b' }), [
    'origin:below',
    'a:through',
    'b:above',
    'c:alone',
    'd:below',
    'e:through',
    'destination:above',
  ]);
});

test('a wrapped ride with several rows between its end and its start folds them into one fold with no rail', () => {
  // Start at e, end at a: b, c and d are outside. Folded, they wear the rail they wear open, as any folded rows do.
  assert.deepEqual(loopRailFor({ start: 'e', end: 'a' }), [
    'origin:below',
    'a:above',
    'b:below',
    'c:through',
    'd:above',
    'fold-after:none',
    'e:below',
    'destination:above',
  ]);
});

test('the rail is not run from the end to the start when no row lies between them', () => {
  // Start at c, end at b: the ride is c, d, e, the tip, a, b and nothing is outside it,
  // yet b and c sit next to each other on the card and the rail must still break between them.
  assert.deepEqual(loopRailFor({ start: 'c', end: 'b' }), [
    'origin:below',
    'a:through',
    'b:above',
    'c:below',
    'd:through',
    'e:through',
    'destination:above',
  ]);
});

test('a start alone on a loop is no ride yet: the rows above it open, the rest folded, as on any trip', () => {
  assert.deepEqual(loopRailFor({ start: 'c' }), [
    'origin:below',
    'a:through',
    'b:above',
    'c:alone',
    'd:below',
    'e:through',
    'fold-after:none',
    'destination:alone',
  ]);
});

test('an end row picked with a start on a loop runs the ride round to the tip, never back to the origin', () => {
  assert.deepEqual(loopRailFor({ start: 'c', endRow: 'to' }), [
    'origin:alone',
    'a:through',
    'b:above',
    'fold-before:none',
    'c:below',
    'd:through',
    'e:through',
    'destination:above',
  ]);
  // The origin's row is the same end on a loop: it rides on to the tip too.
  assert.deepEqual(
    loopRailFor({ start: 'c', endRow: 'from' }),
    loopRailFor({ start: 'c', endRow: 'to' }),
  );
});

test('a closed fold between the end and the start carries no rail, an open one does not either: it sits by the ride', () => {
  const closed = loopRailFor({ start: 'e', end: 'a' });
  const open = loopRailFor({ start: 'e', end: 'a', open: { after: true } });
  assert.ok(closed.includes('fold-after:none'));
  assert.ok(open.includes('fold-after:none'));
});
