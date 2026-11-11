// "Other routes" for a trip opened from Go here (src/features/routes/model/other-routes-for-ride.ts,
// .scratch/go-here ticket 03): the ride's other options in their rank, without the trip's own; a
// row's option, for its picks; and any other trip's list as it is today.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/other-routes-for-ride-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  otherRoutesForTrip,
  rideOptionFor,
} from '../../src/features/routes/model/other-routes-for-ride.ts';
import { otherRoutesFrom } from '../../src/features/routes/model/departures.ts';

const direction = (id, head, tail) => ({
  id,
  routeId: id,
  isReverse: false,
  route: { headHotspotId: head, tailHotspotId: tail },
  shape: {
    coordinates: [
      [0, 0],
      [1, 1],
    ],
  },
});
const hotspot = (id) => ({ id });
const option = (dir, board, stop, walkM) => ({
  direction: dir,
  name: dir.id,
  board: hotspot(board),
  stop: hotspot(stop),
  walkToBoardM: walkM,
  walkFromStopM: 0,
  rideM: 1000,
});

const TALA_NOVA = direction('talaNova', 'tala', 'nova');
const TALA_SM = direction('talaSm', 'tala', 'sm');
const BAGONG = direction('bagongNova', 'bagong', 'nova');
const ALL = [TALA_NOVA, TALA_SM, BAGONG];
// Best first, as oneRideOptions gives them.
const OPTIONS = [
  option(BAGONG, 'b1', 'n1', 100),
  option(TALA_NOVA, 't1', 'n2', 300),
  option(TALA_SM, 't1', 's1', 500),
];

test('from Go here: the other options in their rank, never the trip itself', () => {
  assert.deepEqual(otherRoutesForTrip(ALL, TALA_NOVA, OPTIONS), [BAGONG, TALA_SM]);
  assert.deepEqual(otherRoutesForTrip(ALL, BAGONG, OPTIONS), [TALA_NOVA, TALA_SM]);
  assert.deepEqual(otherRoutesForTrip(ALL, BAGONG, OPTIONS.slice(0, 1)), []);
});

test('any other trip: the other routes out of where it starts, as today', () => {
  assert.deepEqual(otherRoutesForTrip(ALL, TALA_NOVA, null), otherRoutesFrom(ALL, TALA_NOVA));
  assert.deepEqual(otherRoutesForTrip(ALL, TALA_NOVA, null), [TALA_SM]);
});

test("a row's option carries its own picks; none when the trip didn't come from Go here", () => {
  const picked = rideOptionFor(OPTIONS, TALA_SM);
  assert.equal(picked.board.id, 't1');
  assert.equal(picked.stop.id, 's1');
  assert.equal(rideOptionFor(null, TALA_SM), undefined);
  assert.equal(rideOptionFor(OPTIONS, direction('elsewhere', 'x', 'y')), undefined);
});
