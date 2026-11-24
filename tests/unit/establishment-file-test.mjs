// The establishment files (scripts/establishments, .scratch/establishments step E3a): which OSM
// tags are which kind, what a row keeps, how the places are cut into cells by the grid the app
// shares, what the check refuses, what the refresh's comparison flags, and that the files parse
// with the app's own schemas (src/features/routes/published/establishment-file-schema.ts).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/establishment-file-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import {
  ESTABLISHMENT_CELL_DEG,
  establishmentCellOf,
} from '../../src/features/routes/published/establishment-cells.ts';
import {
  establishmentCellSchema,
  establishmentIndexSchema,
} from '../../src/features/routes/published/establishment-file-schema.ts';
import { compareEstablishments, countsOf } from '../../scripts/establishments/compare.mjs';
import {
  ESTABLISHMENT_DIR,
  ESTABLISHMENT_KINDS,
  establishmentFiles,
  readEstablishmentFiles,
} from '../../scripts/establishments/establishment-file.mjs';
import { establishmentFilesProblems } from '../../scripts/establishments/establishment-problems.mjs';
import {
  establishmentKind,
  establishmentsFrom,
  extrasOf,
  osmiumFilters,
} from '../../scripts/establishments/establishments.mjs';

const BOX = { west: 120.6, south: 13.6, east: 121.5, north: 15.05 };
const node = (id, tags, [lng, lat] = [121.053, 14.62]) => ({
  id: `n${id}`,
  properties: tags,
  geometry: { type: 'Point', coordinates: [lng, lat] },
});

test('the tags of each kind: pawnshops, remittance, sari-sari stores, clinics; nothing disused', () => {
  assert.equal(establishmentKind({ shop: 'pawnbroker' }), 'pawnshop');
  assert.equal(establishmentKind({ amenity: 'payment_centre' }), 'remittance');
  assert.equal(establishmentKind({ amenity: 'money_transfer' }), 'remittance');
  assert.equal(establishmentKind({ shop: 'variety_store' }), 'convenience');
  assert.equal(establishmentKind({ shop: 'general' }), 'convenience');
  assert.equal(establishmentKind({ healthcare: 'dentist' }), 'clinic');
  assert.equal(establishmentKind({ shop: 'chemist' }), 'pharmacy');
  assert.equal(establishmentKind({ amenity: 'school' }), null, 'the landmark file has schools');
  assert.equal(establishmentKind({ amenity: 'bank', disused: 'yes' }), null);
  assert.ok(osmiumFilters().some((f) => f.startsWith('nwr/shop=') && f.includes('pawnbroker')));
});

test("a row keeps a brand that says more than the name, and a bank's ATM", () => {
  assert.deepEqual(extrasOf({ name: 'BPI', brand: 'BPI' }, 'atm'), {});
  assert.deepEqual(extrasOf({ name: 'BPI Cubao', brand: 'BPI' }, 'bank'), { brand: 'BPI' });
  assert.deepEqual(extrasOf({ name: 'BDO', atm: 'yes' }, 'bank'), { atm: true });
  assert.deepEqual(extrasOf({ brand: 'Petron' }, 'fuel'), { brand: 'Petron' });
});

test('nameless places only where the kind is enough; the area over its line; inside the box; in order', () => {
  const area = {
    id: 'a20',
    properties: { amenity: 'pharmacy', name: 'Mercury Drug' },
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [121, 14.6],
            [121.001, 14.6],
            [121.001, 14.601],
            [121, 14.6],
          ],
        ],
      ],
    },
  };
  const places = establishmentsFrom(
    [
      node(3, { amenity: 'restaurant' }),
      node(4, { amenity: 'atm' }),
      node(5, { shop: 'pawnbroker', name: 'Cebuana Lhuillier' }),
      node(6, { amenity: 'cafe', name: 'Far away' }, [125, 10]),
      { ...area, id: 'w10', geometry: { type: 'LineString', coordinates: [[121, 14.6]] } },
      area,
    ],
    BOX,
  );
  assert.deepEqual(
    places.map(({ id, kind, name }) => [id, kind, name]),
    [
      ['n4', 'atm', null],
      ['n5', 'pawnshop', 'Cebuana Lhuillier'],
      ['w10', 'pharmacy', 'Mercury Drug'],
    ],
  );
});

test('the grid the build and the app share: 0.05°, a cell named by its column and row', () => {
  assert.equal(ESTABLISHMENT_CELL_DEG, 0.05);
  assert.equal(establishmentCellOf(121.053, 14.62), '2421-292');
  assert.equal(establishmentCellOf(121.04999, 14.6), '2420-292');
});

/** n places of every kind, spread over two cells, so the check's per-kind floor holds. */
const sample = (n = 20) =>
  ESTABLISHMENT_KINDS.flatMap((kind, k) =>
    Array.from({ length: n }, (_, i) => ({
      id: `n${k * 1000 + i}`,
      kind,
      name: i % 2 ? `${kind} ${i}` : null,
      point: [i % 2 ? 121.053 : 121.003, 14.62],
      extras: kind === 'bank' && i === 1 ? { atm: true } : {},
    })),
  );

test('the files: an index listing each cell with its count, size and hash; sound, and parsed by the app', () => {
  const files = establishmentFiles({ extractAt: '2026-11-21T21:20:51Z', establishments: sample() });
  assert.deepEqual([...files.cells.keys()], ['2420-292', '2421-292']);
  assert.deepEqual(establishmentFilesProblems(files), []);
  const index = establishmentIndexSchema.parse(JSON.parse(files.index));
  assert.equal(
    index.cells.reduce((sum, { count }) => sum + count, 0),
    sample().length,
  );
  for (const text of files.cells.values()) establishmentCellSchema.parse(JSON.parse(text));
});

test('the check refuses a changed cell, a place in the wrong cell, a file the index lacks', () => {
  const files = establishmentFiles({ extractAt: '2026-11-21T21:20:51Z', establishments: sample() });
  const changed = new Map(files.cells);
  changed.set('2420-292', files.cells.get('2420-292').replace('121.003', '121.053'));
  const problems = establishmentFilesProblems({ index: files.index, cells: changed });
  assert.ok(problems.some((p) => /size or hash/.test(p)));
  assert.ok(problems.some((p) => /lies in another cell/.test(p)));
  changed.set('9999-9999', files.cells.get('2421-292'));
  assert.ok(
    establishmentFilesProblems({ index: files.index, cells: changed }).some((p) =>
      /does not list/.test(p),
    ),
  );
  const few = establishmentFiles({ extractAt: '2026-11-21T21:20:51Z', establishments: sample(2) });
  assert.ok(establishmentFilesProblems(few).some((p) => /^Only 2 establishments of kind/.test(p)));
});

test('the refresh flags a cell that lost more than half, and refuses a build that lost a fifth', () => {
  const before = countsOf(
    establishmentFiles({ extractAt: '2026-11-21T21:20:51Z', establishments: sample(20) }),
  );
  const fewer = sample(20).filter(({ point }) => point[0] > 121.05);
  const after = countsOf(
    establishmentFiles({ extractAt: '2026-12-21T21:00:00Z', establishments: fewer }),
  );
  const comparison = compareEstablishments(before, after, ESTABLISHMENT_KINDS);
  assert.deepEqual(comparison.halved, [{ cell: '2420-292', before: 150, after: 0 }]);
  assert.equal(comparison.hasShrunkTooMuch, true);
  assert.equal(compareEstablishments(before, before, ESTABLISHMENT_KINDS).halved.length, 0);
});

test('the committed files, once the monthly refresh has built them, are sound and parse', () => {
  const dir = new URL(`../../${ESTABLISHMENT_DIR}/`, import.meta.url);
  if (!existsSync(new URL('index.json', dir))) return;
  const files = readEstablishmentFiles(dir.pathname);
  assert.deepEqual(establishmentFilesProblems(files), []);
  establishmentIndexSchema.parse(JSON.parse(files.index));
  for (const text of files.cells.values()) establishmentCellSchema.parse(JSON.parse(text));
});
