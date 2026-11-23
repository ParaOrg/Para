// Which areas a pull request touches (scripts/checks/pr-areas.mjs, areas.json), and the warning
// when it is more than one.
//
//   node --test tests/unit/pr-areas-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import { areaOf, areasOf, spanWarning } from '../../scripts/checks/pr-areas.mjs';

const { areas } = JSON.parse(readFileSync('areas.json', 'utf8'));

test("each of Para's code folders has its area", () => {
  assert.equal(areaOf('src/features/contribute/recorder/use-recording.ts', areas), 'contributor');
  assert.equal(
    areaOf('android/app/src/main/java/ph/para/contributor/RideService.java', areas),
    'contributor APK',
  );
  assert.equal(areaOf('src/features/studio/data/env.ts', areas), 'studio');
  assert.equal(areaOf('src/app/public-map/main.tsx', areas), 'commuter');
  assert.equal(areaOf('src/features/routes/model/routes.ts', areas), 'shared');
  assert.equal(areaOf('docs/adr/0001-visitors-read-a-published-file.md', areas), null);
});

test('every prefix in areas.json names a file or folder that exists', () => {
  for (const prefixes of Object.values(areas)) {
    for (const prefix of prefixes) assert.ok(existsSync(prefix), prefix);
  }
});

test('one area, with docs and tests beside it, is no warning', () => {
  const touched = areasOf(
    ['src/features/studio/panels/a.tsx', 'docs/x.md', 'tests/unit/a-test.mjs'],
    areas,
  );
  assert.deepEqual(
    touched.map((t) => t.area),
    ['studio'],
  );
  assert.equal(spanWarning(touched), null);
});

test('two areas are a warning naming both, with their file counts', () => {
  const touched = areasOf(
    ['src/features/contribute/a.ts', 'src/features/contribute/b.ts', 'android/app/build.gradle'],
    areas,
  );
  assert.match(spanWarning(touched), /spans 2 areas: contributor APK \(1\), contributor \(2\)/);
});
