// The studio's OSM route files (scripts/osm-routes/osm-route-file.mjs, .scratch/osm-route-start):
// which relations are offered and as what, how a route's ways become one line with its gaps,
// the clip to the map's area, the files' shapes, and the committed files.
//
//   node --test tests/unit/osm-route-file-test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  OSM_ROUTE_DIR,
  chainWays,
  clipToBox,
  metresBetween,
  osmRouteCountsTable,
  osmRouteFrom,
  osmRouteIndexProblems,
  osmRouteIndexText,
  osmRouteProblems,
  osmRoutesFrom,
  osmRouteText,
  readOpl,
  routeKindOf,
  simplify,
} from '../../scripts/osm-routes/osm-route-file.mjs';

const BOX = { west: 120.6, south: 13.6, east: 121.5, north: 15.05 };

test('a relation is offered as a jeepney, UV, bus or rail route, or not at all', () => {
  const route = (tags) => routeKindOf({ type: 'route', ...tags });
  assert.equal(route({ route: 'share_taxi' }), 'jeepney');
  assert.equal(route({ route: 'bus', bus: 'share_taxi', ref: '101' }), 'jeepney');
  assert.equal(route({ route: 'bus', ref: 'T436' }), 'jeepney');
  assert.equal(route({ route: 'bus', name: 'Jeepney Route 407: Balibago → Biñan' }), 'jeepney');
  assert.equal(route({ route: 'bus', network: 'LTFRB PUJ' }), 'jeepney');
  assert.equal(route({ route: 'minibus' }), 'uv');
  assert.equal(route({ route: 'bus', name: 'Lancaster to Patindig Araw FX Route' }), 'uv');
  assert.equal(route({ route: 'bus', ref: '1', name: 'Route 1: EDSA Carousel' }), 'bus');
  assert.equal(route({ route: 'light_rail', name: 'LRT Line 1' }), 'rail');
  assert.equal(route({ route: 'subway' }), 'rail');
  assert.equal(route({ route: 'train' }), 'rail');
  assert.equal(route({ route: 'ferry' }), null, 'ferries are not drawn in the studio');
  assert.equal(route({ route: 'bicycle' }), null);
  assert.equal(routeKindOf({ type: 'route_master', route_master: 'bus' }), null);
});

test('ways chain into one line whatever their order says, turned round where they run back', () => {
  // 1-2-3, then 3-4 written backwards (4-3), then 4-5.
  assert.deepEqual(
    chainWays([
      [1, 2, 3],
      [4, 3],
      [4, 5],
    ]),
    { line: [1, 2, 3, 4, 5], gaps: [] },
  );
  // The first way runs the other way: 3-2-1, then 3-4.
  assert.deepEqual(
    chainWays([
      [3, 2, 1],
      [3, 4],
    ]),
    { line: [1, 2, 3, 4], gaps: [] },
  );
  // Both the first and second run backwards.
  assert.deepEqual(
    chainWays([
      [2, 1],
      [3, 2],
      [4, 3],
    ]),
    { line: [1, 2, 3, 4], gaps: [] },
  );
  // A way that shares no end starts a new stretch after a gap: the gap is after index 2.
  assert.deepEqual(
    chainWays([
      [1, 2, 3],
      [7, 8],
      [8, 9],
    ]),
    {
      line: [1, 2, 3, 7, 8, 9],
      gaps: [2],
    },
  );
  // After a gap, the new stretch's one way may also need turning.
  assert.deepEqual(
    chainWays([
      [1, 2],
      [8, 7],
      [8, 9],
    ]),
    { line: [1, 2, 7, 8, 9], gaps: [1] },
  );
  // A way of one node is skipped.
  assert.deepEqual(chainWays([[1], [1, 2]]), { line: [1, 2], gaps: [] });
});

test('a line is simplified within its tolerance, its ends always kept', () => {
  const straight = [
    [121, 14.6],
    [121.0005, 14.60001],
    [121.001, 14.6],
  ];
  assert.deepEqual(simplify(straight, 5), [straight[0], straight[2]], 'a 1 m bend goes');
  const bent = [
    [121, 14.6],
    [121.0005, 14.601],
    [121.001, 14.6],
  ];
  assert.deepEqual(simplify(bent, 5), bent, 'a 110 m bend stays');
  assert.ok(Math.abs(metresBetween([121, 14.6], [121, 14.61]) - 1113) < 2);
});

test('a provincial line keeps its longest run in the map’s area, and says it was clipped', () => {
  const points = [
    [120.0, 14.0], // outside, west
    [120.9, 14.5],
    [121.0, 14.6],
    [121.1, 14.7],
    [122.5, 14.7], // outside, east
  ];
  const clipped = clipToBox(points, [1, 3], BOX);
  assert.deepEqual(clipped.points, points.slice(1, 4));
  assert.deepEqual(
    clipped.gaps,
    [0],
    'the gap after point 1 stays, as 0; the one at the edge goes',
  );
  assert.equal(clipped.isClipped, true);
  assert.equal(clipToBox(points.slice(1, 4), [], BOX).isClipped, false);
});

/** OPL as osmium writes it, for a small route of three ways with a gap and two stops. */
const OPL = [
  'n1 v1 dV c0 t2020-01-01T00:00:00Z i0 u T x121.0000000 y14.6000000',
  'n2 v1 dV c0 t2020-01-01T00:00:00Z i0 u T x121.0100000 y14.6000000',
  'n3 v1 dV c0 t2020-01-01T00:00:00Z i0 u T x121.0200000 y14.6000000',
  'n4 v1 dV c0 t2020-01-01T00:00:00Z i0 u T x121.0300000 y14.6000000',
  'n5 v1 dV c0 t2020-01-01T00:00:00Z i0 u T x121.0400000 y14.6000000',
  'n6 v1 dV c0 t2020-01-01T00:00:00Z i0 u Tname=Philcoa,public_transport=stop_position x121.0000000 y14.6000000',
  'n7 v1 dV c0 t2020-01-01T00:00:00Z i0 u Tname=UP%20%Town%20%Center x121.0400000 y14.6000000',
  'w10 v1 dV c0 t2020-01-01T00:00:00Z i0 u T Nn1,n2',
  'w11 v1 dV c0 t2020-01-01T00:00:00Z i0 u T Nn3,n2',
  'w12 v1 dV c0 t2020-01-01T00:00:00Z i0 u T Nn4,n5',
  'r99 v7 dV c0 t2026-07-30T01:02:03Z i0 u Ttype=route,route=bus,bus=share_taxi,ref=T101,name=Philcoa%20%%2192%%20%UP%20%Town%20%Center,from=Philcoa,to=UP%20%Town%20%Center,network=LTFRB%20%National%20%Capital%20%Region,source:ref=LTFRB%20%MC%20%2022-067,note=check Mn6@stop,w10@,w11@,w12@,n7@stop_exit_only',
  'r98 v1 dV c0 t2026-07-30T01:02:03Z i0 u Ttype=route,route=ferry,name=Ferry Mw10@',
];

test('a relation becomes the route the studio reads: its line, gap, stops and provenance', () => {
  const opl = readOpl(OPL);
  const route = osmRouteFrom(
    opl.relations.find((r) => r.id === 99),
    opl,
    BOX,
  );
  assert.equal(route.kind, 'jeepney');
  assert.equal(route.ref, 'T101');
  assert.equal(route.name, 'Philcoa → UP Town Center');
  assert.equal(route.version, 7);
  assert.equal(route.lastEdit, '2026-07-30');
  assert.equal(route.clipped, false);
  assert.deepEqual(route.provenance, { 'source:ref': 'LTFRB MC 2022-067', note: 'check' });
  // n1-n2-n3 (the straight middle point simplified away), then a gap, then n4-n5.
  assert.deepEqual(route.line, [
    [121, 14.6],
    [121.02, 14.6],
    [121.03, 14.6],
    [121.04, 14.6],
  ]);
  assert.deepEqual(route.gaps, [[1, 1077]]);
  assert.deepEqual(route.stops, [
    ['stop', 121, 14.6, 'Philcoa'],
    ['stop_exit_only', 121.04, 14.6, 'UP Town Center'],
  ]);
  assert.deepEqual(
    osmRoutesFrom(opl, BOX).map((r) => r.id),
    [99],
    'the ferry is not offered',
  );
  const far = { west: 100, south: 0, east: 101, north: 1 };
  assert.deepEqual(osmRoutesFrom(opl, far), [], 'a route never in the box is not offered');
});

test('the index and a route’s file are their header and rows, and are checked', () => {
  const opl = readOpl(OPL);
  const [route] = osmRoutesFrom(opl, BOX);
  const text = osmRouteText({ extractAt: '2026-11-23T21:21:17Z', route });
  assert.deepEqual(osmRouteProblems(text), []);
  const file = JSON.parse(text);
  assert.equal(file.license, 'ODbL-1.0');
  assert.equal(file.attribution, '© OpenStreetMap contributors');
  assert.equal(file.extract_at, '2026-11-23T21:21:17Z');
  assert.match(
    osmRouteProblems(text.replace('"kind": "jeepney"', '"kind": "ferry"')).join(),
    /not offered/,
  );
  assert.match(osmRouteProblems(text.replace('[[1,1077]]', '[[9,1077]]')).join(), /gaps are not/);

  let nextId = 99000;
  const many = (kind, n) => Array.from({ length: n }, () => ({ ...route, id: nextId++, kind }));
  const routes = [
    ...many('jeepney', 200),
    ...many('uv', 1),
    ...many('bus', 200),
    ...many('rail', 6),
  ];
  const index = osmRouteIndexText({ extractAt: 'x', routes });
  assert.deepEqual(osmRouteIndexProblems(index), []);
  const row = JSON.parse(index).routes[0];
  assert.deepEqual(row.slice(0, 11), [
    99000,
    'jeepney',
    'T101',
    'Philcoa → UP Town Center',
    'Philcoa',
    'UP Town Center',
    'LTFRB National Capital Region',
    7,
    '2026-07-30',
    1,
    2,
  ]);
  const few = osmRouteIndexText({ extractAt: 'x', routes: many('jeepney', 200) });
  assert.match(osmRouteIndexProblems(few).join(' '), /0 rail routes is fewer than the 6/);
  assert.match(
    osmRouteIndexProblems(index.replace('[99001,', '[99000,')).join(' '),
    /listed twice/,
  );
  assert.match(osmRouteCountsTable('', index), /\| rail \| 0 \| 6 \| \+6 \|/);
});

test('the committed files are sound, every route in the index has its file, and the lines are there', () => {
  const index = readFileSync(`${OSM_ROUTE_DIR}/index.json`, 'utf8');
  assert.deepEqual(osmRouteIndexProblems(index), []);
  const routes = JSON.parse(index).routes;
  for (const [id] of routes) {
    const text = readFileSync(`${OSM_ROUTE_DIR}/r${id}.json`, 'utf8');
    assert.deepEqual(osmRouteProblems(text), [], `r${id}.json`);
  }
  // The three lines the commuter map draws, each way, with every station.
  const stopsOf = (id) => JSON.parse(readFileSync(`${OSM_ROUTE_DIR}/r${id}.json`, 'utf8')).stops;
  assert.equal(stopsOf(110418).length, 25, 'LRT-1, Fernando Poe Jr. to Dr. Santos');
  assert.equal(stopsOf(110410).length, 13, 'LRT-2, Antipolo to Recto');
  assert.equal(stopsOf(109159).length, 13, 'MRT-3, North Avenue to Taft Avenue');
  assert.ok(stopsOf(10183711).length >= 19, 'the EDSA Carousel, Monumento to PITX');
});
