// Every Cache Storage name this app creates must fail the old app's prefix
// test: a phone that still holds "Para PH" caches tells it apart from ours by
// OLD_APP_CACHE_PREFIX (src/features/published-map/old-app.ts), and the public
// map's worker deletes every cache that starts with it (public/old-app-cleanup.js).
// A name of ours that matched would read as the old app and be deleted.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/cache-names-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { OLD_APP_CACHE_PREFIX } from '../../src/features/published-map/old-app.ts';
import { MAP_FILE_CACHE } from '../../src/features/routes/published/map-file.ts';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

/** All the matches of a pattern's first group in a file's text. */
const found = (path, pattern) => [...read(path).matchAll(pattern)].map((match) => match[1]);

// The public map's runtime caches, named in the offline worker's config.
const RUNTIME_CACHES = found('vite.config.ts', /cacheName: '([^']+)'/g);
// The contributor page's cache: a fixed prefix the build completes with a version.
const CONTRIBUTE_PREFIXES = [
  ...found('src/app/contribute/contribute-sw.ts', /const CACHE_PREFIX = '([^']+)'/g),
  ...found('scripts/node/contribute-worker.ts', /JSON\.stringify\(`([^`$]+)\$\{version\}`\)/g),
];
// Workbox names its own precache and runtime caches with these prefixes.
const WORKBOX_PREFIXES = ['workbox-precache-v2-', 'workbox-runtime-'];

/** A name, or a prefix completed by anything, that the old app's test could match. */
function couldBeOldApp(prefix) {
  return prefix.startsWith(OLD_APP_CACHE_PREFIX) || OLD_APP_CACHE_PREFIX.startsWith(prefix);
}

test('the names are read from the source, so a renamed cache is checked too', () => {
  assert.deepEqual(RUNTIME_CACHES, [
    'map-file',
    'map-lines',
    'signboards',
    'basemap-meta',
    'basemap-tiles',
  ]);
  assert.ok(RUNTIME_CACHES.includes(MAP_FILE_CACHE));
  assert.deepEqual(CONTRIBUTE_PREFIXES, ['para-contribute-', 'para-contribute-']);
});

test('no cache of ours starts with the old app prefix, whatever follows it', () => {
  for (const name of [...RUNTIME_CACHES, ...CONTRIBUTE_PREFIXES, ...WORKBOX_PREFIXES]) {
    assert.equal(couldBeOldApp(name), false, name);
  }
});

test('the check itself tells an old-app name from ours', () => {
  assert.equal(couldBeOldApp('para-ph-runtime'), true);
  assert.equal(couldBeOldApp('para-'), true, 'a prefix that could go on as para-ph-');
  assert.equal(couldBeOldApp('para-contribute-'), false);
});
