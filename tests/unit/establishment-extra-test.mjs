// The establishments the basemap's tiles lack (src/features/routes/map/establishment-extra.ts,
// .scratch/establishments step E3b): which cells a view asks for, and which of a cell's places
// the layer draws.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/establishment-extra-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { cellsIn } from '../../src/features/routes/map/establishment-cell-layer.ts';
import {
  EXTRA_LAYER,
  EXTRA_MIN_ZOOM,
  extraFeatures,
} from '../../src/features/routes/map/establishment-extra.ts';

test('a street-level view asks for the cells it touches, and a wide one for none', () => {
  // A phone at z16 over Cubao: about 0.007° across, inside one cell.
  assert.deepEqual(cellsIn(121.05, 14.617, 121.057, 14.624), ['2421-292']);
  // Across a corner of four cells.
  assert.deepEqual(cellsIn(121.048, 14.598, 121.052, 14.602).sort(), [
    '2420-291',
    '2420-292',
    '2421-291',
    '2421-292',
  ]);
  assert.deepEqual(cellsIn(120.9, 14.4, 121.2, 14.8), [], 'too many cells: none');
});

test('a cell gives its pawnshops and remittance centres, nothing else, a nameless one unnamed', () => {
  const cell = {
    schema: 1,
    cell: '2420-292',
    attribution: '© OpenStreetMap contributors',
    establishments: [
      ['n1', 'pawnshop', 121.049, 14.621, 'Palawan Pawnshop'],
      ['n2', 'atm', 121.049, 14.621],
      ['n3', 'remittance', 121.048, 14.622, null, { brand: 'Cebuana Lhuillier' }],
      ['n4', 'restaurant', 121.047, 14.623, 'Jollibee'],
    ],
  };
  assert.deepEqual(
    extraFeatures(cell).map(({ properties, geometry }) => [properties, geometry.coordinates]),
    [
      [{ id: 'n1', kind: 'pawnshop', name: 'Palawan Pawnshop' }, [121.049, 14.621]],
      [{ id: 'n3', kind: 'remittance', name: '' }, [121.048, 14.622]],
    ],
  );
});

test('the layer starts at street level, its names a zoom closer', () => {
  assert.equal(EXTRA_LAYER.minzoom, EXTRA_MIN_ZOOM);
  assert.equal(EXTRA_MIN_ZOOM, 16);
  assert.deepEqual(EXTRA_LAYER.layout['text-field'], ['step', ['zoom'], '', 17, ['get', 'name']]);
});
