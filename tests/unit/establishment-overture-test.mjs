// Overture's places on the map (src/features/routes/map/establishment-overture.ts,
// .scratch/establishments step E3c): that the files scripts/overture writes parse with the app's
// schema, which of a cell's places the layer draws and with which marker and colour, where the
// layer goes, and its credit.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/establishment-overture-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { establishmentFiles } from '../../scripts/establishments/establishment-file.mjs';
import { OVERTURE_FILES, OVERTURE_KINDS } from '../../scripts/overture/overture-file.mjs';
import {
  OVERTURE_ATTRIBUTION,
  OVERTURE_GLYPHS,
  OVERTURE_KIND_GLYPH,
  SMALL_LODGING_ZOOM,
  OVERTURE_LAYER,
  OVERTURE_SOURCE,
  overtureFeatures,
} from '../../src/features/routes/map/establishment-overture.ts';
import { EXTRA_LAYER } from '../../src/features/routes/map/establishment-extra.ts';
import { familyOfGlyph } from '../../src/features/routes/map/establishment-kinds.ts';
import {
  overtureCellSchema,
  overtureIndexSchema,
} from '../../src/features/routes/published/overture-file-schema.ts';

/** Files as the monthly build writes them: one place of each kind, one with a brand. */
function builtFiles() {
  const establishments = OVERTURE_KINDS.map((kind, i) => ({
    id: `o${String(i).padStart(16, '0')}`,
    kind,
    name: `${kind} place`,
    point: [121.05 + i * 0.0001, 14.62],
    extras: i === 0 ? { brand: 'Kuya J' } : {},
  }));
  return establishmentFiles({ extractAt: '2026-11-18.0', establishments }, OVERTURE_FILES);
}

test('the files the monthly build writes parse with the app’s schema, and the OSM kinds do not', () => {
  const { index, cells } = builtFiles();
  const parsed = overtureIndexSchema.parse(JSON.parse(index));
  assert.equal(parsed.release, '2026-11-18.0');
  assert.equal(parsed.attribution, OVERTURE_ATTRIBUTION);
  for (const text of cells.values()) overtureCellSchema.parse(JSON.parse(text));
  const osmRow = JSON.stringify({
    schema: 1,
    cell: '2420-292',
    attribution: OVERTURE_ATTRIBUTION,
    establishments: [['o0000000000000001', 'pawnshop', 121.05, 14.62, 'Not Overture’s']],
  });
  assert.throws(() => overtureCellSchema.parse(JSON.parse(osmRow)));
});

test('a cell gives every place, by kind and name, a nameless one unnamed', () => {
  const cell = {
    schema: 1,
    cell: '2420-292',
    attribution: OVERTURE_ATTRIBUTION,
    establishments: [
      ['o0000000000000001', 'cafe', 121.049, 14.621, 'Kape Tayo'],
      ['o0000000000000002', 'dentist', 121.048, 14.622, null, { brand: 'SmileCare' }],
    ],
  };
  assert.deepEqual(
    overtureFeatures(cell).map(({ properties, geometry }) => [properties, geometry.coordinates]),
    [
      [{ id: 'o0000000000000001', kind: 'cafe', name: 'Kape Tayo' }, [121.049, 14.621]],
      [{ id: 'o0000000000000002', kind: 'dentist', name: '' }, [121.048, 14.622]],
    ],
  );
});

test('every kind has an OSM marker and a family colour; eateries are food, clinics health', () => {
  assert.deepEqual(Object.keys(OVERTURE_KIND_GLYPH).sort(), [...OVERTURE_KINDS].sort());
  for (const glyph of OVERTURE_GLYPHS) assert.notEqual(familyOfGlyph(glyph), null, glyph);
  assert.equal(familyOfGlyph(OVERTURE_KIND_GLYPH.restaurant), 'food');
  assert.equal(familyOfGlyph(OVERTURE_KIND_GLYPH.dentist), 'health');
  assert.equal(familyOfGlyph(OVERTURE_KIND_GLYPH.school), 'education');
  // The stores take the OSM establishments' own markers: no new icon.
  assert.equal(OVERTURE_KIND_GLYPH.convenience, 'convenience');
  assert.equal(OVERTURE_KIND_GLYPH.supermarket, 'grocery');
  assert.equal(OVERTURE_KIND_GLYPH.pharmacy, 'pharmacy');
  assert.equal(OVERTURE_KIND_GLYPH.laundry, 'laundry');
  assert.equal(familyOfGlyph(OVERTURE_KIND_GLYPH.convenience), 'shopping');
  assert.equal(familyOfGlyph(OVERTURE_KIND_GLYPH.pharmacy), 'health');
  // Where to stay: Maki's lodging glyph, a services marker for now.
  assert.equal(OVERTURE_KIND_GLYPH.hotel, 'lodging');
  assert.equal(OVERTURE_KIND_GLYPH.lodging, 'lodging');
  assert.equal(familyOfGlyph('lodging'), 'services');
});

test('the small places to stay show a zoom after the hotels; every other kind at the layer’s zoom', () => {
  assert.equal(SMALL_LODGING_ZOOM, OVERTURE_LAYER.minzoom + 1);
  assert.deepEqual(OVERTURE_LAYER.filter, [
    'any',
    ['!=', ['get', 'kind'], 'lodging'],
    ['>=', ['zoom'], SMALL_LODGING_ZOOM],
  ]);
});

test('the layer is styled as the pawnshops are, from the same zoom, under its own source', () => {
  assert.equal(OVERTURE_LAYER.id, OVERTURE_SOURCE);
  assert.equal(OVERTURE_LAYER.source, OVERTURE_SOURCE);
  assert.equal(OVERTURE_LAYER.minzoom, EXTRA_LAYER.minzoom);
  for (const key of ['text-field', 'text-font', 'text-size', 'text-anchor', 'text-offset'])
    assert.deepEqual(OVERTURE_LAYER.layout[key], EXTRA_LAYER.layout[key], key);
  assert.equal(OVERTURE_ATTRIBUTION, '© Overture Maps Foundation');
});
