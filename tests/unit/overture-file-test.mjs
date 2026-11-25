// The Overture place files (scripts/overture, .scratch/establishments step E3c): which names read
// like addresses, how a point on a road's centre line is found, when OpenStreetMap already has a
// place, what a row keeps, what the check refuses under Overture's licence, and the guard that the
// OSM and Overture files never hold each other's ids.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/overture-file-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { establishmentFiles } from '../../scripts/establishments/establishment-file.mjs';
import { establishmentFilesProblems } from '../../scripts/establishments/establishment-problems.mjs';
import { mixedIdProblems } from '../../scripts/overture/check.mjs';
import {
  KIND_OF_CATEGORY,
  OVERTURE_FILES,
  OVERTURE_KINDS,
  overtureIdOf,
} from '../../scripts/overture/overture-file.mjs';
import {
  folded,
  isAddressLike,
  isInOsm,
  isOnRoad,
  isSameName,
  metresToSegment,
  osmPlaceGrid,
  overturePlacesFrom,
  roadGrid,
} from '../../scripts/overture/overture.mjs';

const BOX = { west: 120.6, south: 13.6, east: 121.5, north: 15.05 };
const AT = [121.05, 14.62];
/** A point `metres` north of AT. */
const north = (metres) => [AT[0], AT[1] + metres / 111_320];
const road = (highway, a, b) => ({
  properties: { highway },
  geometry: { type: 'LineString', coordinates: [a, b] },
});
/** A road running east–west through AT. */
const ROADS = roadGrid([road('primary', [AT[0] - 0.002, AT[1]], [AT[0] + 0.002, AT[1]])]);
const NO_OSM = osmPlaceGrid({ establishmentCells: [], landmarks: [] });
const place = (overrides = {}) => ({
  id: '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
  name: 'Kusina ni Aling Nena',
  category: 'restaurant',
  status: null,
  brand: null,
  lng: AT[0],
  lat: north(40)[1],
  ...overrides,
});

test('a name that reads like an address is no place name, and a place name is', () => {
  for (const name of ['123 Aurora Blvd', 'P. Tuazon St.', 'Brgy. San Roque', 'Blk 4 Lot 9'])
    assert.equal(isAddressLike(name), true, name);
  for (const name of ['Jollibee Cubao', 'Kusina ni Aling Nena', 'Dental Studio 21'])
    assert.equal(isAddressLike(name), false, name);
});

test('names match folded, whole words only, and short ones only exactly', () => {
  assert.equal(folded('Café Mañana!'), 'cafe manana');
  assert.equal(isSameName('jollibee', 'jollibee aurora cubao'), true);
  assert.equal(isSameName('mang inasal', 'mang inasal'), true);
  assert.equal(isSameName('cafe', 'cafe ole'), false);
  assert.equal(isSameName('jolli', 'jollibee'), false);
  assert.equal(isSameName('', 'jollibee'), false);
});

test('a point on a road’s centre line is found, one a few metres off it is not', () => {
  assert.ok(metresToSegment(north(5), [AT[0] - 0.001, AT[1]], [AT[0] + 0.001, AT[1]]) - 5 < 0.1);
  assert.equal(isOnRoad(ROADS, north(2)), true);
  assert.equal(isOnRoad(ROADS, north(7)), true, 'a primary road keeps 8 m clear');
  assert.equal(isOnRoad(ROADS, north(12)), false);
  const lane = roadGrid([road('residential', [AT[0] - 0.001, AT[1]], [AT[0] + 0.001, AT[1]])]);
  assert.equal(isOnRoad(lane, north(0.5)), true);
  assert.equal(isOnRoad(lane, north(2)), false, 'a residential road keeps only 1 m clear');
});

test('a place OSM already has, by name near it or brand a little further, is OSM’s', () => {
  const cell = JSON.stringify({
    establishments: [
      ['n1', 'fast_food', AT[0], north(30)[1], 'Jollibee Aurora', { brand: 'Jollibee' }],
      ['n2', 'pharmacy', AT[0], north(30)[1], 'Mercury Drug'],
    ],
  });
  const osm = osmPlaceGrid({
    establishmentCells: [cell],
    landmarks: [{ kind: 'school', point: north(20), name: 'Cubao Elementary School' }],
  });
  const candidate = (kind, name, metres, brand) => ({ kind, name, point: north(metres), brand });
  assert.equal(isInOsm(osm, candidate('fast_food', 'Jollibee Aurora', 60)), true);
  assert.equal(isInOsm(osm, candidate('restaurant', 'Jollibee', 100, 'Jollibee')), true);
  assert.equal(isInOsm(osm, candidate('restaurant', 'Jollibee', 300, 'Jollibee')), false);
  assert.equal(isInOsm(osm, candidate('cafe', 'Mercury Drug', 30)), false, 'not a café’s kind');
  assert.equal(isInOsm(osm, candidate('school', 'Cubao Elementary School', 25)), true);
  assert.equal(isInOsm(osm, candidate('restaurant', 'Kusina ni Aling Nena', 30)), false);
});

test('the places kept: named, off the road, not OSM’s, open, in the box, in kind order', () => {
  const { establishments, dropped } = overturePlacesFrom(
    [
      place(),
      place({ id: '1a', name: 'Kape Tayo', category: 'coffee_shop' }),
      place({ id: '2a', name: '45 Aurora Blvd' }),
      place({ id: '3a', lat: AT[1] }),
      place({ id: '4a', status: 'closed' }),
      place({ id: '5a', category: 'gas_station' }),
      place({ id: '6a', lng: 125 }),
      place({ id: '7a', name: 'SM Cubao Dental', category: 'dental_clinic', brand: 'SmileCare' }),
    ],
    { roads: ROADS, osm: NO_OSM, box: BOX },
  );
  assert.deepEqual(dropped, { name: 1, road: 1, osm: 0, closed: 1 });
  assert.deepEqual(
    establishments.map(({ id, kind, extras }) => [id, kind, extras]),
    [
      [overtureIdOf(place().id), 'restaurant', {}],
      ['o1a', 'cafe', {}],
      ['o7a', 'dentist', { brand: 'SmileCare' }],
    ],
  );
});

test('every category pull.py keeps has a kind, and every kind is one the map can draw', () => {
  for (const kind of Object.values(KIND_OF_CATEGORY)) assert.ok(OVERTURE_KINDS.includes(kind));
  assert.equal(overtureIdOf('08F2A-BC4d-0000-1111-2222'), 'o08f2abc4d0000111');
  assert.match(overtureIdOf('0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d'), OVERTURE_FILES.idPattern);
});

/** A sound set of Overture files: twenty of each kind, so the check's per-kind floor holds. */
function overtureFixture() {
  const establishments = OVERTURE_KINDS.flatMap((kind, k) =>
    Array.from({ length: 20 }, (_, i) => ({
      id: `o${String(k * 100 + i).padStart(16, '0')}`,
      kind,
      name: `${kind} ${i}`,
      point: [121.05 + i * 0.0001, 14.62],
      extras: {},
    })),
  );
  return establishmentFiles({ extractAt: '2026-11-18.0', establishments }, OVERTURE_FILES);
}

test('Overture files pass the check under their own licence, credit and ids', () => {
  const files = overtureFixture();
  assert.deepEqual(establishmentFilesProblems(files, OVERTURE_FILES), []);
  const index = JSON.parse(files.index);
  assert.equal(index.license, 'CDLA-Permissive-2.0 AND Apache-2.0 AND CC0-1.0');
  assert.equal(index.attribution, '© Overture Maps Foundation');
  assert.equal(index.release, '2026-11-18.0');
  assert.equal(index.extract_at, undefined);
  assert.notDeepEqual(establishmentFilesProblems(files), [], 'the OSM check refuses them');
});

test('the guard: no Overture id in the OSM cells, no OSM id in Overture’s', () => {
  const osmCell = (ids) =>
    JSON.stringify({ establishments: ids.map((id) => [id, 'cafe', 121.05, 14.62]) });
  const osm = new Map([['2420-291', osmCell(['n1', 'w2'])]]);
  const overture = new Map([['2420-291', osmCell(['o0123456789abcdef'])]]);
  assert.deepEqual(mixedIdProblems(osm, overture), []);
  assert.equal(
    mixedIdProblems(new Map([['2420-291', osmCell(['n1', 'o0123456789abcdef'])]]), overture).length,
    1,
  );
  assert.equal(
    mixedIdProblems(osm, new Map([['2420-291', osmCell(['o0123456789abcdef', 'n9'])]])).length,
    1,
  );
});
