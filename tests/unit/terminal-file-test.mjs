// The terminals file (scripts/terminals/terminal-file.mjs, .scratch/terminals): which OSM places
// are jeepney, UV Express or bus terminals, the file's shape and the committed file.
//
//   node --test tests/unit/terminal-file-test.mjs
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  TERMINAL_FILE_PATH,
  TERMINAL_KINDS,
  osmIdOf,
  terminalCountsTable,
  terminalFileProblems,
  terminalFileText,
  terminalKindOf,
  terminalsFrom,
} from '../../scripts/terminals/terminal-file.mjs';

const BOX = { west: 120.6, south: 13.6, east: 121.5, north: 15.05 };

test('a terminal is typed by its name first, then by the few tags that say', () => {
  const station = (name, tags = {}) => terminalKindOf({ amenity: 'bus_station', name, ...tags });
  assert.equal(station('Tala-Novaliches Jeep Terminal'), 'jeepney');
  assert.equal(station('UP-Katipunan PUJ Terminal'), 'jeepney');
  assert.equal(station('Molino UV Express Terminal'), 'uv');
  assert.equal(station('Antipolo FX Transport Terminal'), 'uv');
  assert.equal(station('Victory Liner Caloocan Bus Terminal'), 'bus');
  assert.equal(station('JAM Liner - Cabuyao Terminal'), 'bus');
  assert.equal(station('Zapote Terminal'), 'unknown');
  assert.equal(station('Zapote Terminal', { share_taxi: 'yes' }), 'jeepney');
  assert.equal(station('Some Station', { minibus: 'yes' }), 'uv');
  assert.equal(station('Jeepney/UV Express Terminal'), 'jeepney', 'both: listed as a jeepney');
  assert.equal(station('Batangas Port Jeepney Terminal'), 'jeepney', '"port" is not excluded');
});

test('what is no passengers’ terminal: tricycles, taxis, depots, stops, rail and ferries', () => {
  const station = (name, tags = {}) => terminalKindOf({ amenity: 'bus_station', name, ...tags });
  assert.equal(station('Calumpang Tricycle Terminal'), null);
  assert.equal(station('NSG TODA Tricycle Terminal'), null);
  assert.equal(station('Bus Parking'), null);
  assert.equal(station('Five Star Bus Depot'), null);
  assert.equal(station('Ceres Bus Garage'), null);
  assert.equal(station('Jeepney Stop'), null);
  assert.equal(station('Pasig River Ferry Terminal'), null);
  assert.equal(terminalKindOf({ amenity: 'taxi', name: 'Taxi Terminal' }), null);
  assert.equal(terminalKindOf({ highway: 'bus_stop', name: 'Bus Terminal' }), null);
  assert.equal(
    terminalKindOf({ public_transport: 'station', railway: 'station', name: 'Bus Terminal' }),
    null,
  );
  assert.equal(terminalKindOf({ public_transport: 'station', train: 'yes', name: 'X' }), null);
  assert.equal(terminalKindOf({ amenity: 'bus_station' }), null, 'unnamed');
  assert.equal(terminalKindOf({ shop: 'bakery', name: 'Jeep Bakery' }), null, 'not a terminal');
});

test('a terminal mapped twice is one row; ids are OSM’s own; rows sort by kind, then id', () => {
  const feature = (id, name, coordinates, amenity = 'bus_station') => ({
    id,
    geometry: { type: 'Point', coordinates },
    properties: { amenity, name },
  });
  const area = {
    id: 'a1200',
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [121.0, 14.6],
            [121.0002, 14.6],
            [121.0002, 14.6002],
            [121.0, 14.6],
          ],
        ],
      ],
    },
    properties: { amenity: 'bus_station', name: 'Cubao Bus Terminal' },
  };
  const terminals = terminalsFrom(
    [
      feature('n5', 'Cubao Bus Terminal', [121.0001, 14.6001]),
      area,
      feature('n7', 'Philcoa Jeepney Terminal', [121.05, 14.65]),
      feature('n8', 'Far Jeepney Terminal', [123, 14.6]),
    ],
    BOX,
  );
  assert.deepEqual(
    terminals.map(({ id, kind }) => [id, kind]),
    [
      ['n7', 'jeepney'],
      ['n5', 'bus'],
    ],
  );
  assert.equal(osmIdOf('a1200'), 'w600');
  assert.equal(osmIdOf('a1201'), 'r600');
  assert.equal(osmIdOf('n42'), 'n42');
});

test('the file is its header and one [id, kind, lng, lat, name] per terminal', () => {
  const many = (kind, n) =>
    Array.from({ length: n }, (_, i) => ({
      id: `n${kind.length}${i}`,
      kind,
      point: [121, 14.6],
      name: `${kind} terminal ${i}`,
    }));
  const terminals = [...many('jeepney', 20), ...many('uv', 20), ...many('bus', 20)];
  const text = terminalFileText({ extractAt: '2026-11-23T21:21:17Z', terminals });
  assert.deepEqual(terminalFileProblems(text), []);
  const file = JSON.parse(text);
  assert.deepEqual(file.kinds, TERMINAL_KINDS);
  assert.equal(file.license, 'ODbL-1.0');
  assert.deepEqual(file.terminals[0], ['n70', 'jeepney', 121, 14.6, 'jeepney terminal 0']);
  const few = terminalFileText({ extractAt: 'x', terminals: many('jeepney', 20) });
  assert.match(terminalFileProblems(few).join(' '), /0 uv terminals is fewer/);
  const twice = text.replace('"n71"', '"n70"');
  assert.match(terminalFileProblems(twice).join(' '), /listed twice/);
  assert.match(terminalCountsTable('', text), /\| jeepney \| 0 \| 20 \| \+20 \|/);
});

test('the committed file is sound', () => {
  assert.deepEqual(terminalFileProblems(readFileSync(TERMINAL_FILE_PATH, 'utf8')), []);
});
