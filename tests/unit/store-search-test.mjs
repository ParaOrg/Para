// The studio search's stores (src/features/studio/maps/store-search-data.ts): both files read as
// one list, the same name within 50 m listed once with OpenStreetMap's first, and a plain name
// match ranked as the landmarks are. Over the real files, a search stays quick enough to type.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs --test tests/unit/store-search-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { fetchStores, searchStores, sourceOf, SAME_STORE_M } =
  await import('../../src/features/studio/maps/store-search-data.ts');

const file = (attribution, categories, places) => ({
  schema: 1,
  license: 'x',
  attribution,
  categories,
  places,
});

/** fetch answering the two files from `files`, by URL. */
const serve = (files) => async (url) => {
  const body = files[url];
  return body ? { ok: true, json: async () => body } : { ok: false, status: 404 };
};

test('the same name within 50 m is listed once, OpenStreetMap first; farther, twice', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = serve({
    '/data/search/v1/osm.json': file(
      '© OpenStreetMap contributors',
      ['fast_food'],
      [['Jollibee', 0, 121.0, 14.6]],
    ),
    '/data/search/v1/overture.json': file(
      '© Overture Maps Foundation',
      ['fast_food', 'hotel'],
      [
        ['JOLLIBEE', 0, 121.0003, 14.6], // about 32 m east: the same place
        ['Jollibee', 0, 121.002, 14.6], // about 215 m east: another branch
        ['Red Planet', 1, 121.01, 14.6],
      ],
    ),
  });
  try {
    const { stores, attribution } = await fetchStores();
    assert.equal(SAME_STORE_M, 50);
    const jollibees = stores.filter((s) => s.spot.label.toLowerCase() === 'jollibee');
    assert.deepEqual(
      jollibees.map((s) => [sourceOf(s.spot), s.spot.point[0]]),
      [
        ['osm', 121.0],
        ['overture', 121.002],
      ],
    );
    assert.equal(stores.find((s) => s.spot.label === 'Red Planet').spot.detail, 'Hotel · Overture');
    assert.equal(jollibees[0].spot.detail, 'Fast food · OpenStreetMap');
    assert.deepEqual(attribution, {
      osm: '© OpenStreetMap contributors',
      overture: '© Overture Maps Foundation',
    });
    const found = searchStores('jolli', stores, [121.002, 14.6]);
    assert.deepEqual(
      found.map((m) => m.spot.point[0]),
      [121.002, 121.0],
      'nearest first among equal matches',
    );
    assert.deepEqual(searchStores('', stores, null), []);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('a file that is not the shape it should be fails the read', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = serve({
    '/data/search/v1/osm.json': { schema: 2 },
    '/data/search/v1/overture.json': file('x', [], []),
  });
  try {
    await assert.rejects(fetchStores());
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('over the real files, the read and a search stay quick', async () => {
  const realFetch = globalThis.fetch;
  const real = (name) =>
    JSON.parse(readFileSync(new URL(`../../public/data/search/v1/${name}`, import.meta.url)));
  globalThis.fetch = serve({
    '/data/search/v1/osm.json': real('osm.json'),
    '/data/search/v1/overture.json': real('overture.json'),
  });
  try {
    const started = performance.now();
    const { stores } = await fetchStores();
    const readMs = performance.now() - started;
    const one = performance.now();
    const found = searchStores('jollibee', stores, [121.03, 14.65]);
    const searchMs = performance.now() - one;
    assert.ok(stores.length > 100_000, `${stores.length} stores`);
    assert.ok(found.length > 0);
    // Generous bounds for a loaded CI runner; a laptop measures well under them.
    assert.ok(readMs < 8000, `read in ${Math.round(readMs)} ms`);
    assert.ok(searchMs < 1500, `a search in ${Math.round(searchMs)} ms`);
    console.log(
      `${stores.length} stores, read in ${Math.round(readMs)} ms, "jollibee" in ${Math.round(searchMs)} ms`,
    );
  } finally {
    globalThis.fetch = realFetch;
  }
});
