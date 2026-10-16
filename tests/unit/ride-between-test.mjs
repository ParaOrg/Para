// A ride between two picks (src/features/routes/model/ride.ts: rideSpan,
// endsBeforeStart, rideTheOtherWay, rowsOutsideRide): the owner's
// TimelineRouteDetail of 2026-10-15 (Figma 4137:9886). A start and an end
// picked on a trip price and draw the ride between them; an end picked before
// the start is ridden the other way round, on the route's other direction,
// the card left as it is (Variant5); the rows outside the ride fold and lose
// the rail.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/ride-between-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  endsBeforeStart,
  rideSpan,
  rideTheOtherWay,
  routeTimeline,
  rowsOutsideRide,
} from '../../src/features/routes/model/ride.ts';
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
const back = direction('back', [...LINE].reverse(), true);
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

test('nothing picked, a pick the line misses, or an end before the start: no ride on this line', () => {
  assert.equal(rideSpan(there, HOTSPOTS, null, null), null);
  const off = box('off', 0.025, 'Elsewhere', 0.01);
  assert.equal(rideSpan(there, [...HOTSPOTS, off], 'a', 'off'), null);
  assert.equal(rideSpan(there, HOTSPOTS, 'c', 'a'), null);
  assert.equal(endsBeforeStart(there, HOTSPOTS, 'c', 'a'), true);
  assert.equal(endsBeforeStart(there, HOTSPOTS, 'a', 'c'), false);
  assert.equal(endsBeforeStart(there, [...HOTSPOTS, off], 'c', 'off'), false);
});

test('an end before the start is ridden the other way round, on the other direction’s line', () => {
  const passesAll = () => true;
  const span = rideTheOtherWay(back, HOTSPOTS, 'c', 'a', passesAll);
  assert.equal(span.startHotspotId, 'c');
  assert.equal(span.endHotspotId, 'a');
  assert.ok(near(span.metres, 2 * KM), `${span.metres}`);
  assert.ok(span.ridden[0][0] > span.ridden.at(-1)[0], 'from Camarin back to Amparo');
});

test('…landing on its place’s box across the road where the other way misses this one (a jeep)', () => {
  // The way back passes Camarin across the road, not the box picked on the way there.
  const across = box('c2', 0.0301, 'Camarin', 0.0003);
  const hotspots = [...HOTSPOTS, across];
  const passes = (id) => id !== 'c';
  const backLine = [
    [0.05, 0],
    [0.04, 0],
    [0.0301, 0.0003],
    [0.02, 0],
    [0.01, 0],
    [0, 0],
  ];
  const span = rideTheOtherWay(direction('back', backLine, true), hotspots, 'c', 'a', passes);
  assert.equal(span.startHotspotId, 'c2');
  assert.equal(span.endHotspotId, 'a');
});

test('…and no ride to price when the other way passes no box of one of the places', () => {
  const passes = (id) => id !== 'c';
  assert.equal(rideTheOtherWay(back, HOTSPOTS, 'c', 'a', passes), null);
});

test('the rows outside the ride: before the start and after the end, whichever way round they were picked', () => {
  const rows = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
  const outside = (start, end) => [...rowsOutsideRide(rows, start, end)].sort();
  assert.deepEqual(outside(null, null), []);
  assert.deepEqual(outside(null, 'b'), ['c', 'd']);
  assert.deepEqual(outside('b', null), [], 'a start alone is no ride yet (the owner, 2026-10-16)');
  assert.deepEqual(outside('b', 'c'), ['a', 'd']);
  assert.deepEqual(outside('c', 'a'), ['d'], 'Variant5: the stretch from E down to S is the ride');
  assert.deepEqual(outside('gone', 'c'), [], 'a pick no row of these holds');
});

/** The committed map, every line in full: the index and its lines/ (check-map-data.mjs). */
const published = () =>
  readPublished(fileURLToPath(new URL('../../public/data/index.v4.json', import.meta.url))).file;

test('the owner’s example on the committed map: MRT-3 Southbound, Shaw Boulevard to Ayala, and back up to Quezon Avenue', () => {
  const m = published();
  const mrt = m.directions.filter((v) => v.route?.routeCode === 'MRT-3');
  const south = mrt.find((v) => !v.reversed);
  const north = mrt.find((v) => v.reversed);
  assert.ok(south && north, 'MRT-3 runs both ways');
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

  // Variant5: start at Shaw Boulevard, Quezon Avenue tapped, above it on the card.
  assert.equal(endsBeforeStart(south, m.hotspots, shaw.id, quezon.id), true);
  const linked = new Set(m.links.filter((l) => l.directionId === north.id).map((l) => l.hotspotId));
  const up = rideTheOtherWay(north, m.hotspots, shaw.id, quezon.id, (id) => linked.has(id));
  assert.ok(up, 'Shaw Boulevard → Quezon Avenue rides Northbound');
  assert.ok(up.metres > 3000 && up.metres < 12000, `${Math.round(up.metres)} m`);
  assert.ok(railFares('MRT-3', 'Shaw Boulevard', 'Quezon Avenue'), 'priced by the station pair');
});
