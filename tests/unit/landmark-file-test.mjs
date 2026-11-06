// The landmark file place search reads (public/data/landmarks.v1.json, built by
// scripts/landmarks/build.sh from OpenStreetMap): the committed file has the shape, the licence
// and the size the owner set, and the rules that build it keep what they should.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/landmark-file-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  LANDMARK_FILE_MAX_BYTES,
  LANDMARK_FILE_PATH,
  LANDMARK_KINDS,
  landmarkFileProblems,
  landmarkFileText,
} from '../../scripts/landmarks/landmark-file.mjs';
import {
  aliasesOf,
  foldName,
  landmarkKind,
  landmarksFrom,
  osmIdOf,
  pointOf,
  ringCentroid,
  streetLandmarks,
  withoutRepeats,
} from '../../scripts/landmarks/landmarks.mjs';

const committed = readFileSync(new URL(`../../${LANDMARK_FILE_PATH}`, import.meta.url), 'utf8');
const BOX = { west: 120.8, south: 14.3, east: 121.2, north: 14.8 };

test('the committed landmark file is sound and under 3 MB', () => {
  assert.deepEqual(landmarkFileProblems(committed), []);
  assert.ok(Buffer.byteLength(committed) <= LANDMARK_FILE_MAX_BYTES);
});

test('the committed file carries the ODbL licence and the OpenStreetMap credit', () => {
  const file = JSON.parse(committed);
  assert.equal(file.license, 'ODbL-1.0');
  assert.equal(file.attribution, '© OpenStreetMap contributors');
  assert.match(file.license_note, /Open Database License/);
  assert.deepEqual(file.kinds, LANDMARK_KINDS);
});

test('the committed file has every kind the owner listed, and nothing else', () => {
  const kinds = new Set(JSON.parse(committed).landmarks.map(({ kind }) => kind));
  assert.deepEqual([...kinds].sort(), [...LANDMARK_KINDS].sort());
});

test('the file text round-trips and is checked', () => {
  const landmarks = LANDMARK_KINDS.flatMap((kind, k) =>
    Array.from({ length: 5 }, (_, i) => ({
      id: `n${k * 10 + i}`,
      name: `${kind} ${i}`,
      kind,
      point: [121, 14.6],
      aliases: i === 0 ? ['Other name'] : [],
    })),
  );
  const text = landmarkFileText({ extractAt: '2026-11-05T00:12:20Z', landmarks });
  assert.deepEqual(landmarkFileProblems(text), []);
  const row = JSON.parse(text).landmarks[1];
  assert.equal(row.aliases, undefined, 'an empty alias list is left out');
});

test('a broken file is named, not passed', () => {
  assert.match(landmarkFileProblems('{')[0], /not JSON/);
  const text = landmarkFileText({
    extractAt: 'yesterday',
    landmarks: [{ id: 'x1', name: '', kind: 'shop', point: [121], aliases: [] }],
  });
  const problems = landmarkFileProblems(text).join('\n');
  assert.match(problems, /extract_at/);
  assert.match(problems, /not an OSM id/);
  assert.match(problems, /no name/);
  assert.match(problems, /unknown kind shop/);
  assert.match(problems, /not \[lng, lat\]/);
  assert.match(problems, /Only 0 landmarks of kind mall/);
  const big = 'x'.repeat(LANDMARK_FILE_MAX_BYTES + 1);
  assert.match(landmarkFileProblems(big)[0], /over the/);
});

test('the kinds are what the owner listed: no shops, no houses, no nameless places', () => {
  assert.equal(landmarkKind({ name: 'SM City North EDSA', shop: 'mall' }), 'mall');
  assert.equal(landmarkKind({ name: 'UP Diliman', amenity: 'university' }), 'university');
  assert.equal(landmarkKind({ name: 'FEU Institute', amenity: 'college' }), 'university');
  assert.equal(
    landmarkKind({ name: 'Quiapo Church', amenity: 'place_of_worship', religion: 'christian' }),
    'church',
  );
  assert.equal(landmarkKind({ name: 'Cubao', railway: 'station' }), 'station');
  assert.equal(landmarkKind({ name: 'PITX', amenity: 'bus_station' }), 'station');
  assert.equal(
    landmarkKind({ name: 'Bagong Silang', boundary: 'administrative', admin_level: '10' }),
    'barangay',
  );
  assert.equal(
    landmarkKind({ name: 'Caloocan', boundary: 'administrative', admin_level: '6' }),
    null,
  );
  assert.equal(landmarkKind({ name: 'EDSA', highway: 'trunk' }), 'street');
  assert.equal(landmarkKind({ name: 'Side Street', highway: 'residential' }), null);
  assert.equal(landmarkKind({ name: 'Sari-sari', shop: 'convenience' }), null);
  assert.equal(landmarkKind({ name: 'A house', building: 'house' }), null);
  assert.equal(landmarkKind({ amenity: 'school' }), null);
  assert.equal(landmarkKind({ name: 'Old Station', railway: 'station', disused: 'yes' }), null);
});

test('aliases come from the other name tags, once each, never the name itself', () => {
  assert.deepEqual(
    aliasesOf({
      name: 'EDSA',
      alt_name: 'Epifanio de los Santos Avenue;edsa',
      old_name: 'Highway 54',
    }),
    ['Epifanio de los Santos Avenue', 'Highway 54'],
  );
  assert.equal(foldName('  Españа  Blvd '.replace('а', 'a')), 'espana blvd');
});

test("osmium's area ids become the way's or the relation's OSM id", () => {
  assert.equal(osmIdOf('a200'), 'w100');
  assert.equal(osmIdOf('a201'), 'r100');
  assert.equal(osmIdOf('n7'), 'n7');
});

test('an area is its centroid, a point itself, a line its middle vertex', () => {
  const square = [
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2],
    [0, 0],
  ];
  assert.deepEqual(ringCentroid(square), [1, 1]);
  assert.deepEqual(pointOf({ type: 'Polygon', coordinates: [square] }), [1, 1]);
  const small = [
    [10, 10],
    [10.1, 10],
    [10.1, 10.1],
    [10, 10],
  ];
  assert.deepEqual(pointOf({ type: 'MultiPolygon', coordinates: [[small], [square]] }), [1, 1]);
  assert.deepEqual(pointOf({ type: 'Point', coordinates: [3, 4] }), [3, 4]);
  assert.deepEqual(
    pointOf({
      type: 'LineString',
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
    }),
    [1, 1],
  );
});

test('ways of one street that meet are one landmark; a far stretch of the same name is another', () => {
  const way = (id, line) => ({ id, name: 'Aurora Boulevard', aliases: [], line });
  const streets = streetLandmarks([
    way('w2', [
      [121.0, 14.6],
      [121.01, 14.6],
    ]),
    way('w1', [
      [121.01, 14.6],
      [121.02, 14.6],
    ]),
    way('w3', [
      [121.1, 14.6],
      [121.11, 14.6],
    ]),
  ]);
  assert.equal(streets.length, 2);
  assert.deepEqual(streets.map(({ id }) => id).sort(), ['w1', 'w3']);
  assert.deepEqual(streets.find(({ id }) => id === 'w1').point, [121.01, 14.6]);
});

test('a node inside its own outline is kept once, the outline over the node', () => {
  const kept = withoutRepeats([
    {
      id: 'n9',
      name: 'SM City Fairview',
      kind: 'mall',
      point: [121.061, 14.732],
      aliases: ['SM Fairview'],
    },
    { id: 'w5', name: 'SM City Fairview', kind: 'mall', point: [121.0612, 14.7321], aliases: [] },
    { id: 'n8', name: 'SM City Fairview', kind: 'school', point: [121.061, 14.732], aliases: [] },
  ]);
  assert.deepEqual(
    kept.map(({ id }) => id),
    ['w5', 'n8'],
  );
  assert.deepEqual(kept[0].aliases, ['SM Fairview']);
});

test('the build keeps what is in the box, rounded, sorted by kind then name, the area over its line', () => {
  const feature = (id, geometry, properties) => ({ type: 'Feature', id, geometry, properties });
  const ring = [
    [121, 14.6],
    [121.001, 14.6],
    [121.001, 14.601],
    [121, 14.6],
  ];
  const landmarks = landmarksFrom(
    [
      feature(
        'n1',
        { type: 'Point', coordinates: [121.123456789, 14.6] },
        { name: 'Zeta School', amenity: 'school' },
      ),
      feature(
        'w4',
        { type: 'LineString', coordinates: ring },
        { name: 'Alpha Mall', shop: 'mall' },
      ),
      feature('a8', { type: 'Polygon', coordinates: [ring] }, { name: 'Alpha Mall', shop: 'mall' }),
      feature(
        'n2',
        { type: 'Point', coordinates: [125, 10] },
        { name: 'Far School', amenity: 'school' },
      ),
      feature('n3', { type: 'Point', coordinates: [121, 14.6] }, { highway: 'traffic_signals' }),
      feature(
        'n4',
        { type: 'Point', coordinates: [121.05, 14.65] },
        { name: 'Abe School', amenity: 'school' },
      ),
    ],
    BOX,
  );
  assert.deepEqual(
    landmarks.map(({ id, kind, name }) => `${id} ${kind} ${name}`),
    ['w4 mall Alpha Mall', 'n4 school Abe School', 'n1 school Zeta School'],
  );
  assert.deepEqual(landmarks.find(({ id }) => id === 'n1').point, [121.12346, 14.6]);
  assert.deepEqual(landmarks[0].point, [121.00067, 14.60033]);
});
