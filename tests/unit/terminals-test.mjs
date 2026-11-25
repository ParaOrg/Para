// OpenStreetMap's terminals on the map (.scratch/terminals): the file the build writes reads
// under its contract (src/features/routes/published/terminal-file-schema.ts); the commuter's
// markers take the jeepney, UV and bus terminals and the studio's dots all four kinds
// (src/features/routes/map/terminal-points.ts); and the markers' bus is transport's, with its
// glyph vendored beside the others.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/terminals-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import {
  TERMINAL_GLYPH,
  familyOfGlyph,
} from '../../src/features/routes/map/establishment-kinds.ts';
import {
  COMMUTER_TERMINAL_KINDS,
  terminalFeatures,
} from '../../src/features/routes/map/terminal-points.ts';
import {
  TERMINAL_KINDS,
  terminalFileSchema,
} from '../../src/features/routes/published/terminal-file-schema.ts';

const FILE = JSON.parse(
  readFileSync(new URL('../../public/data/terminals.v1.json', import.meta.url), 'utf8'),
);

test('the built file reads under the contract, each row as a terminal', () => {
  const { terminals, attribution } = terminalFileSchema.parse(FILE);
  assert.equal(attribution, '© OpenStreetMap contributors');
  assert.equal(terminals.length, FILE.terminals.length);
  const [first] = terminals;
  const [osmId, kind, lng, lat, name] = FILE.terminals[0];
  assert.deepEqual(first, { osmId, kind, point: [lng, lat], name });
  assert.deepEqual([...TERMINAL_KINDS], FILE.kinds);
});

test('a row of a kind the contract does not know is refused', () => {
  const row = ['n1', 'tricycle', 121, 14.5, 'Somewhere'];
  assert.throws(() => terminalFileSchema.parse({ ...FILE, terminals: [row] }));
});

test('the commuter is shown the typed three, the studio all four', () => {
  const terminals = TERMINAL_KINDS.map((kind, index) => ({
    osmId: `n${index}`,
    kind,
    point: [121, 14.5 + index / 100],
    name: `${kind} terminal`,
  }));
  const kinds = (collection) => collection.features.map((feature) => feature.properties.kind);
  assert.deepEqual(kinds(terminalFeatures(terminals, COMMUTER_TERMINAL_KINDS)), [
    'jeepney',
    'uv',
    'bus',
  ]);
  assert.deepEqual(kinds(terminalFeatures(terminals, TERMINAL_KINDS)), [...TERMINAL_KINDS]);
  const [feature] = terminalFeatures(terminals, TERMINAL_KINDS).features;
  assert.deepEqual(feature.geometry, { type: 'Point', coordinates: [121, 14.5] });
  assert.equal(feature.properties.name, 'jeepney terminal');
});

test("the markers' bus is transport's, and its Maki glyph is vendored", () => {
  assert.equal(familyOfGlyph(TERMINAL_GLYPH), 'transport');
  const icon = new URL(
    `../../src/features/routes/map/establishment-icons/maki/${TERMINAL_GLYPH}.svg`,
    import.meta.url,
  );
  assert.ok(existsSync(icon));
});
