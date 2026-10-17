// A loop: a route that goes round with no ends, shown as Ikot (the owner,
// 2026-10-17). The model's rules (src/features/routes/model/): its name, its
// closed line, the schemas that refuse mixed ends, its timeline round from a
// tip, the ride that only goes forward and wraps, and how the lists show it.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/loop-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LOOP_CLOSED_M,
  LOOP_WORD,
  directionEnds,
  isClosedLine,
  isLoop,
  loopName,
  nameDirections,
  routeName,
} from '../../src/features/routes/model/routes.ts';
import {
  rawDirectionRowSchema,
  rawDirectionSchema,
} from '../../src/features/routes/model/direction-schema.ts';
import {
  hintuansAlong,
  loopRows,
  loopTimeline,
  loopTip,
} from '../../src/features/routes/model/timeline.ts';
import {
  loopFrom,
  rideCut,
  rideSpan,
  rideToEnd,
  routeTimeline,
  tipLine,
  travelLine,
} from '../../src/features/routes/model/ride.ts';
import { rideRows, rowsOutsideRide } from '../../src/features/routes/model/ride-rows.ts';
import {
  departures,
  otherWayHasRoutes,
  switchWord,
  wayWord,
} from '../../src/features/routes/model/departures.ts';
import { lineLength } from '../../src/shared/utils/geo.ts';

const pt = (lng, lat = 0) => ({ type: 'Point', coordinates: [lng, lat] });
const ringAt = (lng, lat = 0, r = 0.0002) => ({
  type: 'Polygon',
  coordinates: [
    [
      [lng - r, lat - r],
      [lng + r, lat - r],
      [lng + r, lat + r],
      [lng - r, lat + r],
      [lng - r, lat - r],
    ],
  ],
});
const place = (id, kind, lng, lat, informal) => ({
  id,
  kind,
  name: informal,
  informal,
  aliases: [],
  point: pt(lng, lat),
  area: ringAt(lng, lat),
  createdAt: '2026-10-17T00:00:00Z',
});
// A square, 0.04° a side (about 4.45 km at the equator), drawn from its south-west corner
// east, north, west and south again: closed on its first point.
const RING = [
  [0, 0],
  [0.04, 0],
  [0.04, 0.04],
  [0, 0.04],
  [0, 0],
];
const SIDE = 0.04 * 111_195;
const PERIMETER = 4 * SIDE;
const near = (a, b, tolerance = 60) => Math.abs(a - b) < tolerance;
// Five places round it, in the order the line reaches them: A on the south side, a terminal
// at the south-east corner, B on the east side, C on the north, D on the west.
const A = place('a', 'hintuan', 0.02, 0, 'Amparo');
const T = place('t', 'terminal', 0.04, 0, 'Terminal');
const B = place('b', 'hintuan', 0.04, 0.02, 'Bestlink');
const C = place('c', 'hintuan', 0.02, 0.04, 'Camarin');
const D = place('d', 'hintuan', 0, 0.02, 'Deparo');
const HOTSPOTS = [A, T, B, C, D];
const loopDirection = (over = {}) => ({
  id: 'ikot',
  routeId: 'r-ikot',
  reversed: false,
  name: null,
  originTerminal: null,
  destinationTerminal: null,
  shape: { type: 'LineString', coordinates: RING },
  route: {
    id: 'r-ikot',
    signboard: 'UP – Ikot',
    longName: null,
    mode: 'jeepney',
    fareNote: null,
    headHotspotId: null,
    tailHotspotId: null,
    isLoop: true,
    via: null,
    routeCode: null,
    name: 'UP – Ikot',
  },
  ...over,
});
const IKOT = loopDirection();
const ALONG = hintuansAlong(RING, HOTSPOTS, IKOT.route).map((x) => x.hotspot);

test('a loop is called by its signboard, with its via when two share one', () => {
  assert.equal(loopName('UP – Ikot', null), 'UP – Ikot');
  assert.equal(loopName('  UP – Ikot ', ' Katipunan '), 'UP – Ikot via Katipunan');
  assert.equal(loopName(null, null), '(unnamed)');
  assert.equal(LOOP_WORD, 'Ikot');
});

test('a closed line ends within 15 m of where it began, with three points or more', () => {
  assert.equal(LOOP_CLOSED_M, 15);
  assert.equal(isClosedLine(RING), true);
  assert.equal(isClosedLine([...RING.slice(0, 4), [0.00009, 0]]), true, '10 m short');
  assert.equal(isClosedLine([...RING.slice(0, 4), [0.0002, 0]]), false, '22 m short');
  assert.equal(
    isClosedLine([
      [0, 0],
      [0.01, 0],
    ]),
    false,
  );
  assert.equal(isClosedLine([]), false);
});

test('only a route marked a loop is one', () => {
  assert.equal(isLoop(IKOT), true);
  assert.equal(isLoop({ route: { headHotspotId: 'h', tailHotspotId: 't' } }), false);
  assert.equal(isLoop({}), false);
});

test('a loop is named by its signboard, a two-ended route by its ends, as before', () => {
  const two = {
    reversed: false,
    name: null,
    route: { signboard: null, headHotspotId: 'h', tailHotspotId: 't', via: null },
  };
  const hotspots = [
    { id: 'h', name: 'Tala', informal: null },
    { id: 't', name: 'Novaliches', informal: null },
  ];
  const [loop, ends] = nameDirections([loopDirection(), two], hotspots);
  assert.equal(loop.name, 'UP – Ikot');
  assert.equal(loop.route.name, 'UP – Ikot');
  assert.equal(ends.route.name, routeName('Tala', 'Novaliches'));
  assert.deepEqual(directionEnds({ ...IKOT, name: 'UP – Ikot' }), {
    from: 'UP – Ikot',
    to: 'Ikot',
  });
});

const rawRoute = (over) => ({
  id: 'r',
  signboard: 'UP – Ikot',
  long_name: null,
  mode: 'jeepney',
  fare_note: null,
  head_stop_id: null,
  tail_stop_id: null,
  via: null,
  name: 'UP – Ikot',
  is_loop: true,
  ...over,
});
const rawDirection = (route) => ({
  id: 'v',
  route_id: 'r',
  direction_name: null,
  origin_terminal: null,
  destination_terminal: null,
  shape: null,
  reversed: false,
  confidence: 'drawn',
  route,
});

test('the index reads a loop, and refuses a row whose ends do not match its kind', () => {
  assert.ok(rawDirectionSchema.safeParse(rawDirection(rawRoute({}))).success, 'a loop');
  assert.ok(
    rawDirectionSchema.safeParse(
      rawDirection(rawRoute({ is_loop: undefined, head_stop_id: 'h', tail_stop_id: 't' })),
    ).success,
    'a two-ended route, without the flag, as every old file has it',
  );
  assert.equal(
    rawDirectionSchema.safeParse(rawDirection(rawRoute({ head_stop_id: 'h' }))).success,
    false,
  );
  assert.equal(
    rawDirectionSchema.safeParse(rawDirection(rawRoute({ head_stop_id: 'h', tail_stop_id: 't' })))
      .success,
    false,
    'a loop with ends',
  );
  assert.equal(
    rawDirectionSchema.safeParse(rawDirection(rawRoute({ is_loop: false }))).success,
    false,
    'a route with no ends that is not a loop',
  );
  assert.equal(
    rawDirectionSchema.safeParse(
      rawDirection(rawRoute({ is_loop: false, head_stop_id: 'h', tail_stop_id: null })),
    ).success,
    false,
    'one end only',
  );
});

test('the studio reads a loop the same way, and a loop row says so only when it is one', () => {
  const row = (route) => ({
    id: 'v',
    route_id: 'r',
    direction_name: null,
    origin_terminal: null,
    destination_terminal: null,
    shape: null,
    reversed: false,
    confidence: 'drawn',
    updated_at: '2026-10-17T00:00:00Z',
    route,
  });
  assert.ok(
    rawDirectionRowSchema.safeParse(
      row({ id: 'r', mode: 'jeepney', head_stop_id: null, tail_stop_id: null, is_loop: true }),
    ).success,
  );
  assert.equal(
    rawDirectionRowSchema.safeParse(
      row({ id: 'r', mode: 'jeepney', head_stop_id: null, tail_stop_id: 't' }),
    ).success,
    false,
  );
});

test('a loop lists its terminals as places, and a two-ended route still lists hintuans only', () => {
  assert.deepEqual(
    ALONG.map((s) => s.id),
    ['a', 't', 'b', 'c', 'd'],
  );
  const two = hintuansAlong(RING, HOTSPOTS, { mode: 'jeepney' }).map((x) => x.hotspot.id);
  assert.deepEqual(two, ['a', 'b', 'c', 'd']);
});

test('a loop’s rows go round in the order its line passes them, a place on the seam once', () => {
  assert.deepEqual(
    loopRows(ALONG).map((r) => r.id),
    ['a', 't', 'b', 'c', 'd'],
  );
  // The line starts and ends in the same place: that is one row, not two.
  const seam = [
    place('s1', 'hintuan', 0, 0, 'Seam'),
    ...ALONG,
    place('s2', 'hintuan', 0, 0, 'Seam'),
  ];
  const rows = loopRows(seam);
  assert.equal(rows.filter((r) => r.label === 'Seam').length, 1);
  assert.equal(rows.length, 6);
  assert.deepEqual(loopRows([]), []);
});

test('a loop’s timeline leaves from its tip and comes back to it, the rows going round past it', () => {
  const t = loopTimeline(ALONG, 'b');
  assert.equal(t.from.id, 'b');
  assert.equal(t.to.id, 'b');
  assert.deepEqual(
    t.between.map((r) => r.id),
    ['c', 'd', 'a', 't'],
  );
  assert.deepEqual(
    loopTimeline(ALONG, null).between.map((r) => r.id),
    ['t', 'b', 'c', 'd'],
  );
  assert.equal(loopTimeline(ALONG, 'nowhere').from.id, 'a', 'a tip that is no row is the first');
  assert.deepEqual(loopTimeline([], 'a'), { from: null, to: null, between: [] });
  assert.deepEqual(routeTimeline(IKOT, HOTSPOTS, ALONG, 'c'), loopTimeline(ALONG, 'c'));
});

test('the tip is where the trip was opened from, else the nearest to the commuter, else the first', () => {
  assert.equal(loopTip(ALONG, null, null), 'a');
  assert.equal(loopTip(ALONG, [0.0001, 0.021], null), 'd', 'nearest to a point by the west side');
  assert.equal(loopTip(ALONG, [0.0001, 0.021], C), 'c', 'opened from a card beats the commuter');
  assert.equal(
    loopTip(ALONG, null, place('c2', 'hintuan', 0.021, 0.04, 'Camarin')),
    'c',
    'another box of the same place is that place’s row',
  );
  assert.equal(loopTip(ALONG, null, place('x', 'hintuan', 9, 9, 'Elsewhere')), 'a');
  assert.equal(loopTip([], [0, 0], null), null);
});

test('a loop’s line is as drawn, never turned round', () => {
  assert.deepEqual(travelLine(IKOT, HOTSPOTS), RING);
});

test('a closed line rotated to leave from a point comes back to it, the same length', () => {
  const half = loopFrom(RING, PERIMETER / 2);
  assert.ok(near(lineLength(half), PERIMETER, 5));
  assert.deepEqual(half[0], half.at(-1));
  assert.ok(near(half[0][1], 0.04, 1e-4), 'halfway round is the north-west corner');
  assert.deepEqual(loopFrom(RING, 0), RING);
  assert.ok(
    near(lineLength(loopFrom(RING, PERIMETER + SIDE)), PERIMETER, 5),
    'past the end goes round again',
  );
  // A line that stops a few metres short is closed first.
  const open = [...RING.slice(0, 4), [0.00005, 0]];
  const rotated = loopFrom(open, SIDE);
  assert.deepEqual(rotated[0], rotated.at(-1));
});

test('a ride on a loop only goes forward, round past the seam when it has to', () => {
  const forward = rideSpan(IKOT, HOTSPOTS, 'a', 'b');
  assert.ok(near(forward.metres, SIDE), `${forward.metres}`);
  assert.equal(forward.isBackwards, false);
  // An end above the start: not back along the line but on round, past the seam.
  const wrapped = rideSpan(IKOT, HOTSPOTS, 'c', 'a');
  assert.ok(near(wrapped.metres, 2 * SIDE), `${wrapped.metres}`); // c round to a: half the loop
  assert.equal(wrapped.isBackwards, false);
  assert.deepEqual(wrapped.ridden[0], wrapped.from);
  assert.deepEqual(wrapped.ridden.at(-1), wrapped.at);
});

test('with no start the ride leaves from the tip, and with no end it comes back to it', () => {
  const fromTip = rideSpan(IKOT, HOTSPOTS, null, 'c', 'b');
  assert.ok(near(fromTip.metres, SIDE), `${fromTip.metres}`);
  const toTip = rideSpan(IKOT, HOTSPOTS, 'c', null, 'b');
  assert.ok(near(toTip.metres, PERIMETER - SIDE), `${toTip.metres}`);
  assert.equal(rideSpan(IKOT, HOTSPOTS, null, null, 'b'), null, 'nothing picked is no ride');
  assert.equal(rideSpan(IKOT, HOTSPOTS, 'nowhere', 'a'), null);
});

test('an end where the start is goes the whole way round', () => {
  const whole = rideSpan(IKOT, HOTSPOTS, 'a', 'a');
  assert.ok(near(whole.metres, PERIMETER, 5), `${whole.metres}`);
});

test('an end row picked with a start rides on round to the tip', () => {
  const toTip = rideToEnd(IKOT, HOTSPOTS, 'c', 'to', 'b');
  assert.ok(near(toTip.metres, PERIMETER - SIDE), `${toTip.metres}`);
  assert.ok(
    near(rideToEnd(IKOT, HOTSPOTS, 'c', 'from', 'b').metres, PERIMETER - SIDE),
    'from is to',
  );
  assert.equal(rideToEnd(IKOT, HOTSPOTS, 'nowhere', 'to', 'b'), null);
});

test('a loop’s line from its tip leaves from the tip’s dot', () => {
  const line = tipLine(IKOT, HOTSPOTS, 'c');
  assert.ok(near(line[0][0], 0.02, 1e-3) && near(line[0][1], 0.04, 1e-3));
  assert.ok(near(lineLength(line), PERIMETER, 5));
  assert.deepEqual(tipLine(IKOT, HOTSPOTS, null), RING, 'no tip, as drawn');
  assert.ok(rideCut(IKOT, HOTSPOTS, 't'), 'a terminal on a loop can be cut at');
  assert.equal(
    rideCut({ ...IKOT, route: { ...IKOT.route, isLoop: undefined } }, HOTSPOTS, 't'),
    null,
  );
});

const ROWS = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }, { id: 'r4' }];

test('a loop’s picked rows: forward as on any trip, wrapped when the end is above the start', () => {
  assert.deepEqual(rideRows(ROWS, 'r1', 'r3', null, true), { first: 0, last: 2 });
  assert.deepEqual(rideRows(ROWS, 'r3', 'r1', null, true), { first: 2, last: 0, wraps: true });
  assert.deepEqual(
    rideRows(ROWS, null, 'r2', null, true),
    { first: -1, last: 1 },
    'the tip is the start',
  );
  assert.deepEqual(rideRows(ROWS, 'r3', null, 'to', true), { first: 2, last: 4 });
  assert.deepEqual(rideRows(ROWS, 'r3', null, 'from', true), { first: 2, last: 4 }, 'from is to');
  // Off a loop an end above the start is the ride back, as it was.
  assert.deepEqual(rideRows(ROWS, 'r3', 'r1'), { first: 0, last: 2 });
  assert.deepEqual(rideRows(ROWS, 'r3', null, 'from'), { first: -1, last: 2 });
});

test('a wrapped ride folds the rows strictly between the end and the start', () => {
  assert.deepEqual([...rowsOutsideRide(ROWS, 'r4', 'r1', null, true)].sort(), ['r2', 'r3']);
  assert.deepEqual([...rowsOutsideRide(ROWS, 'r2', 'r3', null, true)].sort(), ['r1', 'r4']);
  assert.deepEqual(
    [...rowsOutsideRide(ROWS, 'r3', 'r2', null, true)],
    ['r1'].slice(0, 0).concat([]),
  );
});

test('a loop is listed both ways round, under its own name, going to Ikot', () => {
  const two = {
    id: 'v1',
    routeId: 'r1',
    reversed: false,
    name: 'Tala → Novaliches',
    shape: {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [0.1, 0],
      ],
    },
    route: { id: 'r1', headHotspotId: 'h', tailHotspotId: 't', name: 'Tala – Novaliches' },
  };
  const loop = { ...IKOT, name: 'UP – Ikot' };
  for (const back of [false, true]) {
    const listed = departures([two, loop], back).find((p) => p.from === 'UP – Ikot');
    assert.ok(listed, `back=${back}`);
    assert.deepEqual(
      listed.directions.map((d) => d.to),
      ['Ikot'],
    );
  }
  assert.equal(
    departures([two, loop], true).some((p) => p.from === 'Tala'),
    false,
    'the two-ended route only forward',
  );
});

test('the header says Ikot when only loops show, and SWITCH needs a two-ended route the other way', () => {
  const two = (reversed) => ({
    id: `v${reversed}`,
    routeId: 'r1',
    reversed,
    name: reversed ? 'Novaliches → Tala' : 'Tala → Novaliches',
    shape: {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [0.1, 0],
      ],
    },
    route: { id: 'r1', headHotspotId: 'h', tailHotspotId: 't', name: 'Tala – Novaliches' },
  });
  assert.equal(wayWord(false, [IKOT]), 'Ikot');
  assert.equal(wayWord(true, [IKOT, IKOT]), 'Ikot');
  assert.equal(wayWord(false, [two(false)]), 'Papunta');
  assert.equal(
    wayWord(false, [IKOT, two(false)]),
    'Papunta',
    'a loop beside a route keeps the route’s word',
  );
  assert.equal(wayWord(false, []), 'Papunta');
  assert.equal(switchWord(false, [two(false)]), 'Pabalik');
  assert.equal(otherWayHasRoutes([IKOT], false), false, 'loops alone have no other way');
  assert.equal(otherWayHasRoutes([IKOT, two(false), two(true)], false), true);
  assert.equal(otherWayHasRoutes([IKOT, two(false)], false), false, 'the other way is undrawn');
});
