// Place search's step 2 (src/features/routes/model/landmark-search.ts, .scratch/place-search
// decisions 8 and 9): landmarks matched as places are, a landmark that is a Para place kept out of
// the list, Para's places first, and the hintuans with routes within 500 m, nearest first.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/landmark-search-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  NEAR_HERE_M,
  combineResults,
  isParaPlace,
  routesNearHere,
  searchLandmarks as searchFolded,
  searchableLandmarks,
} from '../../src/features/routes/model/landmark-search.ts';
import { searchPlaces, searchablePlaces } from '../../src/features/routes/model/place-search.ts';
import { landmarkFileSchema } from '../../src/features/routes/published/landmark-file-schema.ts';

let next = 0;
const hotspot = (
  name,
  { informal = null, aliases = [], kind = 'hintuan', at = [121, 14.6] } = {},
) => ({
  id: `s${++next}`,
  name,
  informal,
  aliases,
  kind,
  point: { type: 'Point', coordinates: at },
  area: null,
  note: null,
  createdAt: '2026-01-01T00:00:00Z',
  line: null,
});
const landmark = (id, name, kind, point, aliases = []) => ({ id, name, kind, point, aliases });
// The tests hand in plain landmarks; the app folds them once, as the file is read.
const searchLandmarks = (query, landmarks, from) =>
  searchFolded(query, searchableLandmarks(landmarks), from);

const committed = JSON.parse(
  readFileSync(new URL('../../public/data/landmarks.v1.json', import.meta.url), 'utf8'),
);

test('the committed landmark file parses, with the glossary names and every alias list present', () => {
  const file = landmarkFileSchema.parse(committed);
  assert.equal(file.attribution, '© OpenStreetMap contributors');
  assert.equal(typeof file.extractAt, 'string');
  assert.equal(file.extract_at, undefined);
  assert.ok(file.landmarks.length > 1000);
  assert.ok(file.landmarks.every(({ aliases }) => Array.isArray(aliases)));
});

test('a file that is not the landmark file is refused, not half read', () => {
  assert.throws(() => landmarkFileSchema.parse({ ...committed, schema: 2 }));
  assert.throws(() =>
    landmarkFileSchema.parse({
      ...committed,
      landmarks: [{ id: 'x', name: 'A', kind: 'shop', point: [1, 2] }],
    }),
  );
});

test('landmarks match by name and alias, ignoring accents and small typos', () => {
  const landmarks = [
    landmark('w1', 'SM City North EDSA', 'mall', [121.03, 14.656], ['SM North']),
    landmark('w2', 'Parañaque City Hall', 'school', [121.0, 14.48]),
    landmark('w3', 'Trinoma', 'mall', [121.033, 14.653]),
  ];
  assert.deepEqual(
    searchLandmarks('sm north', landmarks).map(({ landmark }) => landmark.id),
    ['w1'],
  );
  assert.equal(searchLandmarks('sm north', landmarks)[0].matchedTerm, 'SM North');
  assert.deepEqual(
    searchLandmarks('paranaque', landmarks).map(({ landmark }) => landmark.id),
    ['w2'],
  );
  assert.deepEqual(
    searchLandmarks('trinomaa', landmarks).map(({ landmark }) => landmark.id),
    ['w3'],
  );
  assert.deepEqual(searchLandmarks('', landmarks), []);
});

test('equal landmark matches rank by own name, then nearest, then name', () => {
  const landmarks = [
    landmark('n1', 'Far Market', 'market', [121.2, 14.7]),
    landmark('n2', 'Near Market', 'market', [121.0, 14.6]),
    landmark('n3', 'Bagsakan', 'market', [121.0, 14.6], ['Bagsakan Market']),
  ];
  const ids = (from) =>
    searchLandmarks('market', landmarks, from).map(({ landmark }) => landmark.id);
  assert.deepEqual(ids(null), ['n1', 'n2', 'n3']);
  assert.deepEqual(ids([121.0, 14.6]), ['n2', 'n1', 'n3']);
});

test("a landmark of a Para place's name within 250 m is that place; farther, or another name, is not", () => {
  const places = searchablePlaces([
    hotspot('SM Fairview Terminal', {
      informal: 'SM Fairview',
      aliases: ['SM City Fairview'],
      at: [121.06, 14.733],
    }),
  ]);
  assert.equal(
    isParaPlace(landmark('w1', 'SM City Fairview', 'mall', [121.061, 14.733]), places),
    true,
  );
  assert.equal(
    isParaPlace(landmark('w2', 'SM City Fairview', 'mall', [121.09, 14.733]), places),
    false,
  );
  assert.equal(
    isParaPlace(landmark('w3', 'Fairview Terraces', 'mall', [121.06, 14.733]), places),
    false,
  );
});

test('results list Para places first, then landmarks that are not places, up to the limit', () => {
  const places = searchablePlaces([
    hotspot('SM Fairview Terminal', { informal: 'SM Fairview', at: [121.06, 14.733] }),
  ]);
  const landmarks = [
    landmark('w1', 'SM City Fairview', 'mall', [121.0605, 14.733]),
    landmark('w2', 'Fairview Terraces', 'mall', [121.06, 14.737]),
    landmark('w3', 'Fairview Elementary School', 'school', [121.066, 14.709]),
  ];
  const query = 'fairview';
  const results = combineResults(
    searchPlaces(query, places),
    searchLandmarks(query, landmarks),
    places,
    2,
  );
  assert.deepEqual(
    results.places.map(({ place }) => place.label),
    ['SM Fairview'],
  );
  // The two left tie on quality and own name, so by name; SM City Fairview is the place itself.
  assert.deepEqual(
    results.landmarks.map(({ landmark }) => landmark.id),
    ['w3'],
  );
});

test('routes near here: hintuans with routes within 500 m, nearest first', () => {
  const at = [121.0, 14.6];
  const near = hotspot('Near Hintuan', { at: [121.001, 14.6] });
  const nearer = hotspot('Nearer Hintuan', { at: [121.0005, 14.6] });
  const unserved = hotspot('No Routes Hintuan', { at: [121.0002, 14.6] });
  const far = hotspot('Far Hintuan', { at: [121.01, 14.6] });
  const terminal = hotspot('A Terminal', { kind: 'terminal', at: [121.0001, 14.6] });
  const links = [
    { directionId: 'd2', hotspotId: near.id, sequence: 3 },
    { directionId: 'd1', hotspotId: near.id, sequence: 1 },
    { directionId: 'd3', hotspotId: nearer.id, sequence: 2 },
    { directionId: 'd4', hotspotId: far.id, sequence: 1 },
    { directionId: 'd5', hotspotId: terminal.id, sequence: 1 },
  ];
  const result = routesNearHere([at], [near, nearer, unserved, far, terminal], links);
  assert.deepEqual(
    result.map(({ hintuan, directionIds }) => [hintuan.name, directionIds]),
    [
      ['Nearer Hintuan', ['d3']],
      ['Near Hintuan', ['d1', 'd2']],
    ],
  );
  assert.ok(result.every(({ distanceM }) => distanceM <= NEAR_HERE_M));
  assert.ok(result[0].distanceM < result[1].distanceM);
});

test("a street's routes near here look from every point along it", () => {
  const along = hotspot('Halfway Hintuan', { at: [121.05, 14.6] });
  const links = [{ directionId: 'd9', hotspotId: along.id, sequence: 1 }];
  // 5 km from the street's middle point, 100 m from one of its points.
  assert.deepEqual(routesNearHere([[121.0, 14.6]], [along], links), []);
  const near = routesNearHere(
    [
      [121.0, 14.6],
      [121.0491, 14.6],
    ],
    [along],
    links,
  );
  assert.deepEqual(
    near.map(({ hintuan }) => hintuan.name),
    ['Halfway Hintuan'],
  );
  assert.ok(near[0].distanceM < 120);
});

test("the file reader gives every landmark its reach: the point, and a street's points", () => {
  const { landmarks } = landmarkFileSchema.parse(committed);
  assert.ok(landmarks.every(({ point, reach }) => reach[0] === point));
  const edsa = landmarks.filter(({ name, kind }) => name === 'EDSA' && kind === 'street');
  assert.ok(edsa.some(({ reach }) => reach.length > 15));
});

test('routes near here is empty where Para has no routes', () => {
  assert.deepEqual(
    routesNearHere([[121.5, 14.9]], [hotspot('Somewhere', { at: [121.0, 14.6] })], []),
    [],
  );
});

test('a search over the whole committed file answers within a keystroke', () => {
  const landmarks = searchableLandmarks(landmarkFileSchema.parse(committed).landmarks);
  const started = performance.now();
  for (const query of ['sm north', 'fairveiw', 'quiapo church', 'espana'])
    searchFolded(query, landmarks);
  const perQueryMs = (performance.now() - started) / 4;
  // A laptop's figure; a phone may be several times slower. Recorded, and held loosely.
  console.error(`searchLandmarks over ${landmarks.length}: ${perQueryMs.toFixed(1)} ms a query`);
  assert.ok(perQueryMs < 200, `${perQueryMs} ms a query`);
});
