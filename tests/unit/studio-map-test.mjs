// Which studio map the address asks for (src/features/studio/maps/studio-map.ts).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/studio-map-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { searchWithMap, studioMapFromSearch } from '../../src/features/studio/maps/studio-map.ts';

test('each of the three maps is read from ?map=', () => {
  assert.equal(studioMapFromSearch('?map=contributors'), 'contributors');
  assert.equal(studioMapFromSearch('?map=playground'), 'playground');
  assert.equal(studioMapFromSearch('?map=public'), 'public');
});

test('no map, an unknown one or another case is the Playground', () => {
  assert.equal(studioMapFromSearch(''), 'playground');
  assert.equal(studioMapFromSearch('?e2e=1'), 'playground');
  assert.equal(studioMapFromSearch('?map='), 'playground');
  assert.equal(studioMapFromSearch('?map=Public'), 'playground');
  assert.equal(studioMapFromSearch('?map=admin'), 'playground');
});

test('choosing a map sets it and keeps every other parameter', () => {
  assert.equal(searchWithMap('', 'public'), '?map=public');
  assert.equal(searchWithMap('?e2e=1', 'contributors'), '?e2e=1&map=contributors');
  assert.equal(searchWithMap('?map=public&e2e=1', 'playground'), '?map=playground&e2e=1');
});
