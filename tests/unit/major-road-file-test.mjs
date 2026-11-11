// The committed major-roads file (public/data/major-roads.v1.json, .scratch/go-here ticket 05):
// sound, under the owner's ceiling, with the licence and credit; and the checker catches what it
// should. The monthly comparison refuses a big shrink.
//
//   node --test tests/unit/major-road-file-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  MAJOR_ROAD_FILE_MAX_BYTES,
  MAJOR_ROAD_FILE_PATH,
  majorRoadFileProblems,
  majorRoadFileText,
} from '../../scripts/major-roads/major-road-file.mjs';
import { compareMajorRoadFiles } from '../../scripts/major-roads/compare.mjs';

const committed = readFileSync(MAJOR_ROAD_FILE_PATH, 'utf8');

test('the committed file is sound and under its ceiling', () => {
  assert.deepEqual(majorRoadFileProblems(committed), []);
  assert.ok(Buffer.byteLength(committed) < MAJOR_ROAD_FILE_MAX_BYTES);
  const file = JSON.parse(committed);
  assert.equal(file.license, 'ODbL-1.0');
  assert.equal(file.attribution, '© OpenStreetMap contributors');
});

const road = (name, extra = {}) => ({
  name,
  kind: 'primary',
  lines: [
    [
      [121, 14.6],
      [121.001, 14.6],
    ],
  ],
  ...extra,
});
const roads = (count) => Array.from({ length: count }, (_, i) => road(`Road ${i}`));
const text = (list) => majorRoadFileText({ extractAt: '2026-11-05T00:12:20Z', roads: list });

test('a written file reads back sound, one road per line, an unnamed road without a name', () => {
  const written = text([...roads(20), road(null)]);
  assert.deepEqual(majorRoadFileProblems(written), []);
  assert.match(written, /\n {4}\{"kind":"primary","lines":/);
});

test('the checker names a wrong kind, a broken line, too few roads and a file over its ceiling', () => {
  const problems = majorRoadFileProblems(
    text([road('A', { kind: 'tertiary' }), road('B', { lines: [[[121, 14.6]]] })]),
  );
  assert.ok(problems.some((p) => p.includes('kind')));
  assert.ok(problems.some((p) => p.includes('two or more')));
  assert.ok(problems.some((p) => p.includes('Only 2 roads')));
  const huge = text(roads(20)).replace(
    '"roads"',
    `"padding": "${'x'.repeat(MAJOR_ROAD_FILE_MAX_BYTES)}",\n  "roads"`,
  );
  assert.ok(majorRoadFileProblems(huge).some((p) => p.includes('ceiling')));
});

test('the comparison refuses a big shrink and counts kilometres', () => {
  const before = { roads: roads(100) };
  assert.equal(compareMajorRoadFiles(before, { roads: roads(95) }).hasShrunkTooMuch, false);
  assert.equal(compareMajorRoadFiles(before, { roads: roads(50) }).hasShrunkTooMuch, true);
  const { rows } = compareMajorRoadFiles({ roads: [] }, { roads: roads(10) });
  assert.deepEqual(
    rows.find((r) => r.what === 'kilometres'),
    { what: 'kilometres', before: 0, after: 1 },
  );
});
