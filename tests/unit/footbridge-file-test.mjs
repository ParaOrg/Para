// The committed footbridge file (public/data/footbridges.v1.json, .scratch/footbridges ticket
// 01): sound, under its ceiling, with the licence and credit; and the checker catches what it
// should. The monthly comparison refuses a big shrink.
//
//   node --test tests/unit/footbridge-file-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  FOOTBRIDGE_FILE_MAX_BYTES,
  FOOTBRIDGE_FILE_PATH,
  footbridgeFileProblems,
  footbridgeFileText,
} from '../../scripts/footbridges/footbridge-file.mjs';
import { compareFootbridgeFiles } from '../../scripts/footbridges/compare.mjs';

const committed = readFileSync(FOOTBRIDGE_FILE_PATH, 'utf8');

test('the committed file is sound and under its ceiling', () => {
  assert.deepEqual(footbridgeFileProblems(committed), []);
  assert.ok(Buffer.byteLength(committed) < FOOTBRIDGE_FILE_MAX_BYTES);
  const file = JSON.parse(committed);
  assert.equal(file.license, 'ODbL-1.0');
  assert.equal(file.attribution, '© OpenStreetMap contributors');
});

const footbridge = (id, extra = {}) => ({
  id,
  name: null,
  isCovered: false,
  lines: [
    [
      [121, 14.6],
      [121.001, 14.6],
    ],
  ],
  access: [],
  ...extra,
});
const fileOf = (footbridges) =>
  footbridgeFileText({ extractAt: '2026-11-05T00:12:20Z', footbridges });
const many = (n) => Array.from({ length: n }, (_, i) => footbridge(`w${i + 1}`));

test('the text round-trips: name, covered and access only when there is one', () => {
  const text = fileOf([
    ...many(60),
    footbridge('w100', {
      name: 'Philcoa',
      isCovered: true,
      access: [{ kind: 'elevator', point: [121, 14.6] }],
    }),
  ]);
  assert.deepEqual(footbridgeFileProblems(text), []);
  const rows = JSON.parse(text).footbridges;
  assert.deepEqual(Object.keys(rows[0]), ['id', 'lines']);
  assert.deepEqual(Object.keys(rows.at(-1)), ['id', 'name', 'covered', 'lines', 'access']);
});

test('the checker catches a broken file', () => {
  const problems = (footbridges) => footbridgeFileProblems(fileOf(footbridges));
  assert.match(problems(many(3)).join(), /Only 3 footbridges/);
  assert.match(problems([...many(60), footbridge('n1')]).join(), /not a way id/);
  assert.match(problems([...many(60), footbridge('w1')]).join(), /repeated/);
  assert.match(
    problems([...many(60), footbridge('w99', { lines: [[[121, 14.6]]] })]).join(),
    /two or more/,
  );
  assert.match(
    problems([
      ...many(60),
      footbridge('w99', { access: [{ kind: 'lift', point: [121, 14.6] }] }),
    ]).join(),
    /access point/,
  );
});

test('the monthly comparison refuses losing more than a fifth of the footbridges', () => {
  const file = (n) => ({ footbridges: many(n) });
  assert.equal(compareFootbridgeFiles(file(100), file(81)).hasShrunkTooMuch, false);
  assert.equal(compareFootbridgeFiles(file(100), file(79)).hasShrunkTooMuch, true);
  // The first build compares against nothing.
  assert.equal(compareFootbridgeFiles({ footbridges: [] }, file(400)).hasShrunkTooMuch, false);
});
