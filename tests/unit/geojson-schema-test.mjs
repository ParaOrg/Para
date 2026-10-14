// The GeoJSON schemas every row and the published index are read through
// (src/features/routes/model/geojson-schema.ts): what each one takes, what it
// refuses, and that a line's coordinates come through as they came — the
// hand-written loop that replaced z.array(z.tuple(…)) must refuse exactly
// what the tuple refused, and copy nothing (2026-10-12).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/geojson-schema-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  lineStringSchema,
  lngLatSchema,
  pointSchema,
  polygonSchema,
} from '../../src/features/routes/model/geojson-schema.ts';

const ok = (schema, value) => schema.safeParse(value).success;
const messages = (schema, value) => schema.safeParse(value).error?.issues.map((i) => i.message);

test('a coordinate is two finite numbers', () => {
  assert.equal(ok(lngLatSchema, [121.0424, 14.741507]), true);
  assert.equal(ok(lngLatSchema, [0, 0]), true);
  assert.equal(ok(lngLatSchema, [-180, -90]), true);
});

test('a coordinate that is not exactly two finite numbers is refused, in words', () => {
  for (const bad of [
    [121],
    [121, 14, 0],
    [],
    ['121', 14],
    [121, null],
    [Number.NaN, 14],
    [121, Number.POSITIVE_INFINITY],
    { 0: 121, 1: 14, length: 2 },
    new Float64Array([121, 14]),
    null,
    undefined,
    '121,14',
  ]) {
    assert.equal(ok(lngLatSchema, bad), false, `took ${JSON.stringify(bad)}`);
  }
  assert.deepEqual(messages(lngLatSchema, [121]), ['Not a [lng, lat] pair']);
});

test('a line string takes its pairs, and keeps the very array it was given', () => {
  const coordinates = [
    [121.043326, 14.742006],
    [121.04184, 14.742003],
    [121.0424, 14.741507],
  ];
  const parsed = lineStringSchema.parse({ type: 'LineString', coordinates });
  assert.equal(parsed.type, 'LineString');
  assert.equal(parsed.coordinates, coordinates);
});

test('a line string with no pairs yet still parses: an empty list is a list of pairs', () => {
  assert.equal(ok(lineStringSchema, { type: 'LineString', coordinates: [] }), true);
});

test('a line string with one bad pair is refused whole, at its coordinates', () => {
  const issues = lineStringSchema.safeParse({
    type: 'LineString',
    coordinates: [
      [121.043326, 14.742006],
      [121.04184, '14.742003'],
    ],
  }).error?.issues;
  assert.deepEqual(
    issues?.map((i) => [i.path, i.message]),
    [[['coordinates'], 'Not a list of [lng, lat] pairs']],
  );
});

test('a line string refuses another geometry type, a missing list, and a flat list', () => {
  assert.equal(ok(lineStringSchema, { type: 'MultiLineString', coordinates: [[[0, 0]]] }), false);
  assert.equal(ok(lineStringSchema, { type: 'LineString' }), false);
  assert.equal(ok(lineStringSchema, { type: 'LineString', coordinates: [121, 14] }), false);
  assert.equal(ok(lineStringSchema, null), false);
});

test('keys GeoJSON allows besides type and coordinates are dropped, not refused', () => {
  const parsed = lineStringSchema.parse({
    type: 'LineString',
    coordinates: [[0, 0]],
    bbox: [0, 0, 0, 0],
  });
  assert.deepEqual(Object.keys(parsed).sort(), ['coordinates', 'type']);
});

test('a point is one pair; a list of pairs is not a point', () => {
  assert.equal(ok(pointSchema, { type: 'Point', coordinates: [121.0424, 14.741507] }), true);
  assert.equal(ok(pointSchema, { type: 'Point', coordinates: [[121.0424, 14.741507]] }), false);
  assert.equal(ok(pointSchema, { type: 'Polygon', coordinates: [121.0424, 14.741507] }), false);
});

test('a polygon is a list of rings, each a list of pairs', () => {
  const ring = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 0],
  ];
  assert.equal(ok(polygonSchema, { type: 'Polygon', coordinates: [ring] }), true);
  assert.equal(ok(polygonSchema, { type: 'Polygon', coordinates: [ring, ring] }), true);
  assert.equal(ok(polygonSchema, { type: 'Polygon', coordinates: [] }), true);
});

test('a polygon refuses a ring with a bad pair, and a ring given bare', () => {
  assert.equal(
    ok(polygonSchema, {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, Number.NaN],
        ],
      ],
    }),
    false,
  );
  assert.equal(
    ok(polygonSchema, {
      type: 'Polygon',
      coordinates: [
        [0, 0],
        [1, 0],
      ],
    }),
    false,
  );
});
