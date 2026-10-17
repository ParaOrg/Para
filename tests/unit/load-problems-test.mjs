// What the public map's notices say about loading the published map
// (src/features/published-map/load-problems.ts): a failure of either read,
// a map file too new for this app, and Try again reading both again.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/load-problems-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadProblems } from '../../src/features/published-map/load-problems.ts';
import { MAP_FILE_TOO_NEW } from '../../src/features/routes/published/map-file.ts';

const source = (error, reads) => ({ error, reload: () => reads.push(error) });

test('nothing failed: no banner', () => {
  const p = loadProblems([source(null, []), source(null, [])]);
  assert.equal(p.loadFailed, false);
  assert.equal(p.tooNew, false);
});

test('either read failing is a failed load; only the too-new error is tooNew', () => {
  const failed = loadProblems([source(null, []), source(new Error('500'), [])]);
  assert.equal(failed.loadFailed, true);
  assert.equal(failed.tooNew, false);
  const tooNew = loadProblems([source(MAP_FILE_TOO_NEW, []), source(null, [])]);
  assert.equal(tooNew.loadFailed, true);
  assert.equal(tooNew.tooNew, true);
});

test('Try again reads every source again, in order', () => {
  const reads = [];
  loadProblems([source('routes', reads), source('hotspots', reads)]).tryAgain();
  assert.deepEqual(reads, ['routes', 'hotspots']);
});
