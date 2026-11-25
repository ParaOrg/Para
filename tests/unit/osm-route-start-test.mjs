// "Start from OSM route" in the studio (src/features/studio/osm-routes/, .scratch/osm-route-start):
// the files read through the studio's schema, the search by ref, name and relation id, the routes
// near a tap, the points a drawing is seeded with, a route that goes out and back, the places an
// editor should check, and that the public map's offline worker keeps none of the files.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs --test tests/unit/osm-route-start-test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { runtimeCaches } from '../../scripts/node/offline-worker-caches.ts';
import { basemapCacheRules } from '../../src/shared/config/basemap-cache-rules.ts';
import { haversine } from '../../src/shared/utils/geo.ts';
import { checkSpots, STRAY_M } from '../../src/features/studio/osm-routes/check-spots.ts';
import {
  fetchOsmRoute,
  fetchOsmRouteIndex,
} from '../../src/features/studio/osm-routes/fetch-osm-routes.ts';
import {
  osmRouteIndexSchema,
  osmRouteSchema,
} from '../../src/features/studio/osm-routes/osm-route-schema.ts';
import {
  osmRoutesNear,
  searchOsmRoutes,
} from '../../src/features/studio/osm-routes/search-osm-routes.ts';
import {
  MAX_SPACING_M,
  seedPoints,
  splitAtTurnaround,
  turnaroundIndex,
  turnAt,
} from '../../src/features/studio/osm-routes/seed-points.ts';

const DIR = new URL('../../public/data/osm-routes/v1/', import.meta.url);
const readJson = (name) => JSON.parse(readFileSync(new URL(name, DIR), 'utf8'));
const index = osmRouteIndexSchema.parse(readJson('index.json'));

/** A point `m` metres east (and `n` north) of a start, near Philcoa. */
const at = (m, n = 0) => [121.05 + m / 107_700, 14.65 + n / 110_600];

test('the committed files read through the studio’s schema', () => {
  assert.ok(index.routes.length > 900, `${index.routes.length} routes`);
  assert.equal(index.attribution, '© OpenStreetMap contributors');
  const carousel = osmRouteSchema.parse(readJson('r10183711.json'));
  assert.equal(carousel.name, 'Route 1: EDSA Carousel');
  assert.equal(carousel.kind, 'bus');
  assert.equal(carousel.isClipped, false);
  assert.equal(carousel.stops[0].name, 'Monumento/MCU');
  assert.equal(carousel.provenance['source:ref'], 'LTFRB Memorandum Circular 2022-067');
  assert.equal(carousel.gaps.length, 1);
});

test('the fetchers read the files by their URLs and fail on a missing one', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const name = String(url).replace('/data/osm-routes/v1/', '');
    let body;
    try {
      body = readJson(name);
    } catch {
      return { ok: false, status: 404 };
    }
    return { ok: true, json: async () => body };
  };
  try {
    assert.equal((await fetchOsmRouteIndex()).routes.length, index.routes.length);
    assert.equal((await fetchOsmRoute(110410)).name, 'LRT Line 2: Antipolo to Recto');
    await assert.rejects(fetchOsmRoute(1), /HTTP 404/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('a search finds a route by relation id, by ref, then by name, from or to', () => {
  const ids = (query) => searchOsmRoutes(query, index.routes).map((route) => route.id);
  assert.deepEqual(ids('r10183711'), [10183711]);
  assert.deepEqual(ids('10183711'), [10183711]);
  const t436 = searchOsmRoutes('T436', index.routes);
  assert.equal(t436[0].ref, 'T436', 'the ref typed whole comes first');
  const carousel = searchOsmRoutes('carousel', index.routes);
  assert.ok(carousel.length >= 2);
  assert.ok(carousel.every((route) => /carousel/i.test(route.name)));
  const philcoa = searchOsmRoutes('Philcoa', index.routes);
  assert.ok(philcoa.length > 0 && philcoa.length <= 20);
  assert.equal(philcoa[0].kind, 'jeepney', 'equal matches list jeepneys first');
  assert.deepEqual(ids('   '), []);
});

test('a tap lists the routes passing near it, nearest first', () => {
  // On EDSA at Ortigas: the Carousel and MRT-3 both pass.
  const near = osmRoutesNear([121.0565, 14.5865], index.routes);
  const nearIds = near.map((route) => route.id);
  assert.ok(nearIds.includes(9453755) || nearIds.includes(10183711), 'the Carousel');
  assert.ok(nearIds.includes(109159) || nearIds.includes(8000253), 'MRT-3');
  assert.ok(near.length <= 20);
  assert.deepEqual(osmRoutesNear([120.65, 15.0], index.routes, 20), [], 'none in a field');
});

test('a drawing is seeded with the route’s ends, its turns, a point at least every 400 m, and both ends of a gap', () => {
  assert.ok(Math.abs(turnAt(at(0), at(100), at(200)) - 0) < 1, 'straight on');
  assert.ok(Math.abs(turnAt(at(0), at(100), at(100, 100)) - 90) < 1, 'a right angle');
  // East 1 km in 100 m steps, then north 200 m: the corner is kept, the straight thinned.
  const line = [...Array.from({ length: 11 }, (_, i) => at(i * 100)), at(1000, 100), at(1000, 200)];
  const seeded = seedPoints({ line, gaps: [] });
  assert.deepEqual(seeded[0], line[0]);
  assert.deepEqual(seeded.at(-1), line.at(-1));
  assert.ok(
    seeded.some((point) => haversine(point, at(1000)) < 1),
    'the corner is a control point',
  );
  for (let i = 1; i < seeded.length; i++)
    assert.ok(haversine(seeded[i - 1], seeded[i]) <= MAX_SPACING_M + 1, `points ${i - 1}–${i}`);
  assert.ok(seeded.length < line.length, 'the straight is thinned');

  // A gap after point 3: both its ends are seeded, so the router bridges it.
  const gapped = seedPoints({ line, gaps: [{ after: 3, metres: 100 }] });
  assert.ok(gapped.some((point) => haversine(point, line[3]) < 1));
  assert.ok(gapped.some((point) => haversine(point, line[4]) < 1));
});

test('a route that goes out and comes back turns at its farthest point, and splits there', () => {
  const out = Array.from({ length: 21 }, (_, i) => at(i * 100));
  const back = Array.from({ length: 20 }, (_, i) => at((19 - i) * 100, 30));
  const route = { line: [...out, ...back], gaps: [{ after: 25, metres: 40 }] };
  const turn = turnaroundIndex(route);
  assert.equal(turn, 20);
  const [way, wayBack] = splitAtTurnaround(route, turn);
  assert.equal(way.line.length, 21);
  assert.deepEqual(way.gaps, []);
  assert.deepEqual(wayBack.line[0], route.line[20]);
  assert.deepEqual(wayBack.gaps, [{ after: 5, metres: 40 }]);
  assert.equal(turnaroundIndex({ line: out, gaps: [] }), null, 'one way only');
  const short = { line: [at(0), at(300), at(0, 50)], gaps: [] };
  assert.equal(turnaroundIndex(short), null, 'too short to mean anything');
});

test('the places to check: each gap, and a stretch the drawn line strays from OSM’s', () => {
  const line = Array.from({ length: 21 }, (_, i) => at(i * 100));
  const route = { line, gaps: [{ after: 4, metres: 100 }] };
  // The drawn line follows OSM's, but between 1,200 and 1,500 m it runs 60 m north of it.
  const drawn = Array.from({ length: 101 }, (_, i) => {
    const m = i * 20;
    return at(m, m >= 1200 && m <= 1500 ? 60 : 0);
  });
  const spots = checkSpots(drawn, route);
  assert.deepEqual(
    spots.map((spot) => spot.kind),
    ['gap', 'stray'],
  );
  assert.ok(haversine(spots[0].at, at(450)) < 1, 'the gap’s middle');
  assert.equal(spots[0].metres, 100);
  assert.ok(haversine(spots[1].at, at(1340, 60)) < 30, 'the stray stretch’s middle');
  assert.ok(spots[1].metres >= STRAY_M);

  // A 10 m wobble is no stray; a 60 m one for only 60 m is too short to be one.
  const wobble = Array.from({ length: 101 }, (_, i) => at(i * 20, i % 2 ? 10 : 0));
  assert.deepEqual(checkSpots(wobble, { line, gaps: [] }), []);
  const blip = Array.from({ length: 101 }, (_, i) => at(i * 20, i >= 50 && i <= 52 ? 60 : 0));
  assert.deepEqual(checkSpots(blip, { line, gaps: [] }), []);
});

test("the public map's offline worker keeps none of the OSM route files", () => {
  const ORIGIN = 'https://www.para-commute.org';
  globalThis.self = { location: { origin: ORIGIN } };
  const rules = runtimeCaches(basemapCacheRules('https://tiles.openfreemap.org'));
  for (const name of ['index.json', 'r10183711.json']) {
    const url = new URL(`/data/osm-routes/v1/${name}`, ORIGIN);
    const request = { method: 'GET', destination: '' };
    const matching = rules.filter(
      (rule) => typeof rule.urlPattern === 'function' && rule.urlPattern({ url, request }),
    );
    assert.deepEqual(matching, [], name);
  }
});
