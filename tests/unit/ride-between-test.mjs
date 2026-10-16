// A ride between two picks (src/features/routes/model/ride.ts: rideSpan,
// rowsOutsideRide): the owner's TimelineRouteDetail of 2026-10-15 (Figma
// 4137:9886). A start and an end picked on a trip price and draw the ride
// between them; an end picked before the start stays the end, and the ride
// runs back along the trip's own line (the owner, 2026-10-16: "reverse the
// arrow, dont' switch please"); the rows outside the ride fold.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/ride-between-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { rideSpan, routeTimeline, rowsOutsideRide } from '../../src/features/routes/model/ride.ts';
import { railFares } from '../../src/features/routes/model/rail-fares.ts';
import { lineLength } from '../../src/shared/utils/geo.ts';
import { readPublished } from '../../scripts/checks/check-map-data.mjs';

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
/** A hintuan box of the place people call `informal`, at [lng, lat]: sample data. */
const box = (id, lng, informal, lat = 0) => ({
  id,
  kind: 'hintuan',
  name: informal,
  informal,
  aliases: [],
  point: pt(lng, lat),
  area: ringAt(lng, lat),
  createdAt: `2026-10-15T00:00:00Z`,
});
const HOTSPOTS = [
  { id: 'h', kind: 'terminal', name: 'Head', informal: null, aliases: [], point: pt(0) },
  { id: 't', kind: 'terminal', name: 'Tail', informal: null, aliases: [], point: pt(0.05) },
  box('a', 0.01, 'Amparo'),
  box('b', 0.02, 'Bestlink'),
  box('c', 0.03, 'Camarin'),
  box('d', 0.04, 'Deparo'),
];
const LINE = [
  [0, 0],
  [0.01, 0],
  [0.02, 0],
  [0.03, 0],
  [0.04, 0],
  [0.05, 0],
];
/** A direction along `coordinates`, from the head to the tail, or back when `reversed`. */
const direction = (id, coordinates, reversed = false) => ({
  id,
  reversed,
  route: { headHotspotId: 'h', tailHotspotId: 't', routeCode: null },
  shape: { type: 'LineString', coordinates },
});
const there = direction('there', LINE);
const KM = 3339.6 / 3; // one 0.01° step at the equator, in metres
const near = (a, b, tolerance = 30) => Math.abs(a - b) < tolerance;

test('a ride between two picks runs from the start’s dot to the end’s, the rest of the line on either side', () => {
  const span = rideSpan(there, HOTSPOTS, 'a', 'c');
  assert.ok(near(span.metres, 2 * KM), `${span.metres}`);
  assert.ok(near(lineLength(span.ridden), span.metres, 1));
  assert.deepEqual(span.ridden[0], span.from);
  assert.deepEqual(span.ridden.at(-1), span.at);
  assert.deepEqual(span.before.at(-1), span.from, 'the pale before the start meets it');
  assert.deepEqual(span.rest[0], span.at, 'and the pale after the end');
  assert.equal(span.isBackwards, false);
  const whole = lineLength(LINE);
  const parts = lineLength(span.before) + span.metres + lineLength(span.rest);
  assert.ok(near(parts, whole, 1), `${parts} of ${whole}`);
});

test('no start picked: the ride leaves where the direction does, as a picked end always has', () => {
  const span = rideSpan(there, HOTSPOTS, null, 'b');
  assert.deepEqual(span.before, []);
  assert.deepEqual(span.from, LINE[0]);
  assert.ok(near(span.metres, 2 * KM), `${span.metres}`);
});

test('no end picked: the ride runs on from the start to where the direction goes (Variant3)', () => {
  const span = rideSpan(there, HOTSPOTS, 'c', null);
  assert.deepEqual(span.at, LINE.at(-1));
  assert.ok(near(span.metres, 2 * KM), `${span.metres}`);
  assert.deepEqual(span.rest, [], 'nothing after the end to pale');
});

test('nothing picked, or a pick the line misses: no ride on this line', () => {
  assert.equal(rideSpan(there, HOTSPOTS, null, null), null);
  const off = box('off', 0.025, 'Elsewhere', 0.01);
  assert.equal(rideSpan(there, [...HOTSPOTS, off], 'a', 'off'), null);
  assert.equal(rideSpan(there, [...HOTSPOTS, off], 'off', 'a'), null);
});

test('an end before the start: the ride runs back along the line from the start’s dot to the end’s, the S and E where they were picked', () => {
  const span = rideSpan(there, HOTSPOTS, 'c', 'a');
  assert.ok(span, 'ridden back on this line (the owner, 2026-10-16)');
  assert.equal(span.isBackwards, true);
  assert.ok(near(span.metres, 2 * KM), `${span.metres}`);
  assert.ok(near(lineLength(span.ridden), span.metres, 1));
  const forward = rideSpan(there, HOTSPOTS, 'a', 'c');
  assert.deepEqual(span.from, forward.at, 'from Camarin’s dot');
  assert.deepEqual(span.at, forward.from, 'to Amparo’s');
  assert.deepEqual(span.ridden[0], span.from);
  assert.deepEqual(span.ridden.at(-1), span.at);
  assert.deepEqual(span.ridden, [...forward.ridden].reverse(), 'the same stretch, turned round');
  assert.deepEqual(span.before, forward.before, 'the pale up to the ride: before Amparo');
  assert.deepEqual(span.rest, forward.rest, 'and on from it: after Camarin');
});

test('the rows outside the ride: before the start and after the end, whichever way round they were picked', () => {
  const rows = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
  const outside = (start, end) => [...rowsOutsideRide(rows, start, end)].sort();
  assert.deepEqual(outside(null, null), []);
  assert.deepEqual(outside(null, 'b'), ['c', 'd']);
  assert.deepEqual(outside('b', null), [], 'a start alone is no ride yet (the owner, 2026-10-16)');
  assert.deepEqual(outside('b', 'c'), ['a', 'd']);
  assert.deepEqual(outside('c', 'a'), ['d'], 'either way round, the stretch between the two');
  assert.deepEqual(outside('gone', 'c'), [], 'a pick no row of these holds');
});

/** The committed map, every line in full: the index and its lines/ (check-map-data.mjs). */
const published = () =>
  readPublished(fileURLToPath(new URL('../../public/data/index.v4.json', import.meta.url))).file;

test('the owner’s example on the committed map: MRT-3 Southbound, Shaw Boulevard to Ayala; Quezon Avenue comes before Shaw Boulevard', () => {
  const m = published();
  const mrt = m.directions.filter((v) => v.route?.routeCode === 'MRT-3');
  const south = mrt.find((v) => !v.reversed);
  assert.ok(south, 'MRT-3 runs Southbound');
  const along = (v) =>
    m.links
      .filter((l) => l.directionId === v.id)
      .sort((a, b) => a.sequence - b.sequence)
      .map((l) => m.hotspots.find((s) => s.id === l.hotspotId))
      .filter(Boolean);
  const rows = routeTimeline(south, m.hotspots, along(south)).between;
  const row = (label) => rows.find((r) => r.label === label);
  const [quezon, shaw, ayala] = [row('Quezon Avenue'), row('Shaw Boulevard'), row('Ayala')];
  assert.ok(quezon && shaw && ayala, rows.map((r) => r.label).join(', '));

  // Variant4: start at Shaw Boulevard, Ayala tapped.
  const span = rideSpan(south, m.hotspots, shaw.id, ayala.id);
  assert.ok(span, 'Shaw Boulevard → Ayala rides Southbound');
  assert.ok(span.metres > 3000 && span.metres < 8000, `${Math.round(span.metres)} m`);
  assert.deepEqual(
    railFares('MRT-3', shaw.label, ayala.label),
    railFares('MRT-3', 'Shaw Boulevard', 'Ayala'),
  );

  // Variant5: start at Shaw Boulevard, Quezon Avenue tapped above it: the
  // end, the ride Shaw Boulevard → Quezon Avenue run back along this line
  // (the owner, 2026-10-16: "reverse the arrow, dont' switch please").
  const back = rideSpan(south, m.hotspots, shaw.id, quezon.id);
  assert.ok(back, 'Shaw Boulevard → Quezon Avenue on the Southbound line');
  assert.equal(back.isBackwards, true);
  assert.ok(back.metres > 3000 && back.metres < 12000, `${Math.round(back.metres)} m`);
  assert.ok(railFares('MRT-3', 'Shaw Boulevard', 'Quezon Avenue'), 'priced by the station pair');
});
