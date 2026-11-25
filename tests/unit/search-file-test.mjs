// The studio's search files (scripts/search/search-file.mjs): what each keeps, the shape both
// share, the committed files, and that the public map's offline worker keeps neither.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/search-file-test.mjs
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { runtimeCaches } from '../../scripts/node/offline-worker-caches.ts';
import {
  ATTRIBUTION as OSM_ATTRIBUTION,
  LICENSE as OSM_LICENSE,
} from '../../scripts/establishments/establishment-file.mjs';
import { OVERTURE_FILES } from '../../scripts/overture/overture-file.mjs';
import {
  OSM_SEARCH,
  OSM_SEARCH_HEADER,
  OVERTURE_SEARCH,
  OVERTURE_SEARCH_HEADER,
  SEARCH_DIR,
  osmSearchPlaces,
  overtureSearchPlaces,
  searchFile,
  searchFileProblems,
} from '../../scripts/search/search-file.mjs';
import { basemapCacheRules } from '../../src/shared/config/basemap-cache-rules.ts';

const ORIGIN = 'https://www.para-commute.org';
const BOX = { west: 120.6, south: 13.6, east: 121.5, north: 15.05 };
const OVERTURE = { license: OVERTURE_FILES.license, attribution: OVERTURE_FILES.attribution };
const OSM = { license: OSM_LICENSE, attribution: OSM_ATTRIBUTION };

test('Overture: every named, open store in the box, once, by its primary category', () => {
  const at = { lng: 121.0577, lat: 14.7339 };
  const places = overtureSearchPlaces(
    [
      { id: 'a', name: ' Lumea Beautei Lounge ', category: 'beauty_salon', ...at },
      { id: 'a', name: 'Lumea Beautei Lounge', category: 'beauty_salon', ...at },
      { id: 'b', name: 'EARCON Trading', category: 'hardware_store', ...at },
      { id: 'c', name: '12 Ilang-Ilang St', category: 'grocery_store', ...at },
      {
        id: 'd',
        name: 'Gone Shop',
        category: 'clothing_store',
        status: 'permanently_closed',
        ...at,
      },
      { id: 'e', name: 'Far Away', category: 'grocery_store', lng: 122.5, lat: 14.7 },
      { id: 'f', name: null, category: 'grocery_store', ...at },
    ],
    BOX,
  );
  assert.deepEqual(
    places.map(({ name, category }) => [name, category]),
    [
      ['Lumea Beautei Lounge', 'beauty_salon'],
      ['EARCON Trading', 'hardware_store'],
    ],
  );
});

test('OSM: every named establishment in the cells, by its kind', () => {
  const cell = JSON.stringify({
    establishments: [
      ['n1', 'convenience', 121.05, 14.73, '7-Eleven'],
      ['n2', 'atm', 121.05, 14.73],
      ['n3', 'pharmacy', 121.06, 14.74, 'Mercury Drug'],
    ],
  });
  assert.deepEqual(osmSearchPlaces([cell]), [
    { name: '7-Eleven', category: 'convenience', point: [121.05, 14.73] },
    { name: 'Mercury Drug', category: 'pharmacy', point: [121.06, 14.74] },
  ]);
});

test('a file lists its categories once and each place as [name, category, lng, lat], stably', () => {
  const places = [
    { name: 'Watsons', category: 'pharmacy', point: [121.06, 14.735] },
    { name: 'Clean Wash', category: 'laundry', point: [121.054, 14.739] },
    { name: 'Southstar Drug', category: 'pharmacy', point: [121.057, 14.736] },
  ];
  const text = searchFile(OVERTURE_SEARCH_HEADER('2026-11-18.0'), places);
  assert.equal(searchFile(OVERTURE_SEARCH_HEADER('2026-11-18.0'), [...places].reverse()), text);
  const file = JSON.parse(text);
  assert.deepEqual(file.categories, ['laundry', 'pharmacy']);
  assert.deepEqual(file.places, [
    ['Clean Wash', 0, 121.054, 14.739],
    ['Southstar Drug', 1, 121.057, 14.736],
    ['Watsons', 1, 121.06, 14.735],
  ]);
  assert.equal(file.release, '2026-11-18.0');
  assert.equal(file.attribution, '© Overture Maps Foundation');
  const problems = searchFileProblems(text, OVERTURE);
  assert.deepEqual(problems, ['3 places is fewer than the 10000 expected.']);
  assert.match(searchFileProblems(text, OSM).join(' '), /licence is not ODbL-1.0/);
  const broken = text.replace('["Watsons",1,', '["Watsons",7,');
  assert.match(searchFileProblems(broken, OVERTURE).join(' '), /1 places are not/);
});

test('the committed files are sound, each under its own licence, and never mixed', () => {
  const overture = readFileSync(`${SEARCH_DIR}/${OVERTURE_SEARCH}`, 'utf8');
  const osm = readFileSync(`${SEARCH_DIR}/${OSM_SEARCH}`, 'utf8');
  assert.deepEqual(searchFileProblems(overture, OVERTURE), []);
  assert.deepEqual(searchFileProblems(osm, OSM), []);
  const establishments = JSON.parse(
    readFileSync('public/data/establishments/v1/index.json', 'utf8'),
  );
  assert.equal(JSON.parse(osm).extract_at, establishments.extract_at);
  assert.equal(JSON.parse(osm).source, OSM_SEARCH_HEADER('').source);
  const overtureIndex = JSON.parse(readFileSync('public/data/overture/v1/index.json', 'utf8'));
  assert.equal(JSON.parse(overture).release, overtureIndex.release);
  for (const text of ['LICENSE-CDLA-Permissive-2.0.txt', 'LICENSE-Apache-2.0.txt', 'NOTICE'])
    assert.ok(readFileSync(`${SEARCH_DIR}/${text}`, 'utf8').length > 100, text);
});

test("the public map's offline worker keeps neither file", () => {
  globalThis.self = { location: { origin: ORIGIN } };
  const rules = runtimeCaches(basemapCacheRules('https://tiles.openfreemap.org'));
  for (const name of [OVERTURE_SEARCH, OSM_SEARCH]) {
    const url = new URL(`/data/search/v1/${name}`, ORIGIN);
    const request = { method: 'GET', destination: '' };
    const matching = rules.filter(
      (rule) => typeof rule.urlPattern === 'function' && rule.urlPattern({ url, request }),
    );
    assert.deepEqual(
      matching.map((rule) => rule.options?.cacheName),
      [],
      name,
    );
  }
  // The control: the same check sees the Overture cells it does keep.
  const cell = new URL('/data/overture/v1/2420-291.json', ORIGIN);
  assert.ok(
    rules.some(
      (rule) =>
        typeof rule.urlPattern === 'function' &&
        rule.urlPattern({ url: cell, request: { method: 'GET', destination: '' } }),
    ),
  );
});
