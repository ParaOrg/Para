// The studio's old Para route files (scripts/old-para-routes/, .scratch/old-para-routes/spec.md):
// a build from the source is the same every time and is what is committed, its lines are joined
// with their gaps, and every route is sound.
//
//   node --test tests/unit/old-para-route-file-test.mjs
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

import {
  OLD_PARA_SOURCE,
  ROUTE_COUNT,
  lineWithGaps,
  oldParaRouteFiles,
  oldParaRouteProblems,
  oldParaRoutesFrom,
} from '../../scripts/old-para-routes/old-para-route-file.mjs';

const ROOT = new URL('../../', import.meta.url);
const DIR = new URL('public/data/old-para-routes/v1/', ROOT);
const source = readFileSync(new URL(OLD_PARA_SOURCE, ROOT), 'utf8');

test('a build is the same every time, and is what is committed', () => {
  const built = oldParaRouteFiles(source);
  assert.deepEqual(oldParaRouteFiles(source), built, 'two builds agree');
  const committed = readdirSync(DIR).sort();
  assert.deepEqual(committed, built.map(([name]) => name).sort(), 'the same files, none stale');
  for (const [name, text] of built)
    assert.equal(readFileSync(new URL(name, DIR), 'utf8'), text, `${name} is the build's`);
});

test('every route is sound: 1,737 of them, each Para ID once, a mode, a name', () => {
  const routes = oldParaRoutesFrom(source);
  assert.equal(routes.length, ROUTE_COUNT);
  assert.deepEqual(oldParaRouteProblems(routes), []);
  assert.equal(routes.filter((route) => route.line).length, 902, 'the routes with a line');
  assert.equal(routes.filter((route) => route.isVerified).length, 49, 'the verified');
  assert.match(oldParaRouteProblems(routes.slice(1))[0], /not the source's 1737/);
});

test("a line's parts join where they meet and leave a gap where they don't", () => {
  const joined = lineWithGaps({
    type: 'MultiLineString',
    coordinates: [
      [
        [121.05, 14.65],
        [121.051, 14.65],
      ],
      [
        [121.051, 14.65],
        [121.052, 14.651],
      ],
      [
        [121.06, 14.66],
        [121.061, 14.66],
      ],
    ],
  });
  assert.equal(joined.line.length, 5);
  assert.equal(joined.gaps.length, 1);
  assert.equal(joined.gaps[0][0], 2, 'after the joined stretch');
  assert.ok(joined.gaps[0][1] > 1000, `${joined.gaps[0][1]} m across`);
  const single = lineWithGaps({
    type: 'LineString',
    coordinates: [
      [121, 14.6],
      [121.001, 14.6],
    ],
  });
  assert.deepEqual(single, {
    line: [
      [121, 14.6],
      [121.001, 14.6],
    ],
    gaps: [],
  });
});
