// The studio search's stores (src/features/studio/maps/store-search-data.ts): both files read as
// one list, the same name within 50 m listed once with OpenStreetMap's first, a name match ranked
// whole, start, word, inside, typo with ties nearest the map's centre, and a category word
// ("botika", "sari-sari", "ATM") listing that category's places nearest it. Over the real files,
// every keystroke stays under 100 ms.
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

/** Stores read from one OSM file of [name, category, lng, lat] rows. */
async function storesOf(categories, places) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = serve({
    '/data/search/v1/osm.json': file('© OpenStreetMap contributors', categories, places),
    '/data/search/v1/overture.json': file('© Overture Maps Foundation', [], []),
  });
  try {
    return (await fetchStores()).stores;
  } finally {
    globalThis.fetch = realFetch;
  }
}

const labels = (matches) => matches.map((m) => m.spot.label);
const CENTRE = [121.0, 14.6];
/** A point `km` east of the centre. */
const east = (km) => [121.0 + km / 107.8, 14.6];

test('a name ranks whole, start, word, inside, then typo; ties nearest the map’s centre', async () => {
  const stores = await storesOf(
    ['convenience'],
    [
      ['Big Puregold Plaza', 0, ...east(0.1)],
      ['Puregold Jr.', 0, ...east(3)],
      ['Puregold', 0, ...east(9)],
      ['Puregold Extra', 0, ...east(1)],
      ['XPuregold', 0, ...east(0.05)],
      ['Puregld Mart', 0, ...east(0.02)],
    ],
  );
  assert.deepEqual(labels(searchStores('puregold', stores, CENTRE)), [
    'Puregold',
    'Puregold Extra',
    'Puregold Jr.',
    'Big Puregold Plaza',
    'XPuregold',
    'Puregld Mart',
  ]);
});

test('a chain lists its nearest branches first, at most eight', async () => {
  const branches = Array.from({ length: 12 }, (_, i) => ['7-Eleven', 0, ...east(12 - i)]);
  const stores = await storesOf(['convenience'], branches);
  const found = searchStores('7-eleven', stores, CENTRE);
  assert.equal(found.length, 8);
  assert.deepEqual(
    found.map((m) => Math.round(m.distanceM / 1000)),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
});

test('a category word, English or Tagalog, lists that category nearest the centre, by kind not name', async () => {
  const stores = await storesOf(
    ['pharmacy', 'convenience', 'atm', 'bank', 'restaurant', 'laundry', 'supermarket'],
    [
      ['Mercury Drug', 0, ...east(2)],
      ['Watsons', 0, ...east(1)],
      ['Botika Burger', 4, ...east(0.1)],
      ['Aling Nena Store', 1, ...east(0.5)],
      ['BDO ATM', 2, ...east(0.3)],
      ['BDO', 3, ...east(0.4)],
      ['Mang Inasal', 4, ...east(0.2)],
      ['Clean Wash', 5, ...east(0.6)],
      ['Puregold', 6, ...east(0.7)],
    ],
  );
  const search = (query) => labels(searchStores(query, stores, CENTRE));
  assert.deepEqual(search('botika'), ['Watsons', 'Mercury Drug'], 'not Botika Burger');
  assert.deepEqual(search('Pharmacy'), ['Watsons', 'Mercury Drug']);
  assert.deepEqual(search('Sari-Sari'), ['Aling Nena Store']);
  assert.deepEqual(search('ATM'), ['BDO ATM']);
  assert.deepEqual(search('bangko'), ['BDO']);
  assert.deepEqual(search('kainan'), ['Botika Burger', 'Mang Inasal']);
  assert.deepEqual(search('labahan'), ['Clean Wash']);
  assert.deepEqual(search('palengke'), ['Puregold']);
  assert.deepEqual(search('botik'), ['Botika Burger'], 'short of the word: names');
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
    assert.ok(stores.length > 100_000, `${stores.length} stores`);
    // Generous for a loaded CI runner; a laptop reads in about a second.
    assert.ok(readMs < 8000, `read in ${Math.round(readMs)} ms`);
    // Every keystroke of a few searches an editor types: chains, a typo, category words. The
    // median of three runs each, so one pause of the runner's does not fail it.
    const near = [121.03, 14.65];
    const typed = ['jollibee', 'mercury drug', '7-eleven', 'purgold', 'botika', 'sari-sari', 'atm'];
    let slowest = { ms: 0, query: '' };
    for (const query of typed) {
      for (let end = 1; end <= query.length; end++) {
        const prefix = query.slice(0, end);
        const runs = [0, 1, 2].map(() => {
          const started = performance.now();
          searchStores(prefix, stores, near);
          return performance.now() - started;
        });
        const ms = runs.sort((a, b) => a - b)[1];
        if (ms > slowest.ms) slowest = { ms, query: prefix };
      }
    }
    assert.ok(searchStores('jollibee', stores, near).length > 0);
    assert.ok(
      slowest.ms < 100,
      `"${slowest.query}" took ${Math.round(slowest.ms)} ms, over the 100 a keystroke may`,
    );
    console.log(
      `${stores.length} stores, read in ${Math.round(readMs)} ms, slowest keystroke "${slowest.query}" ${Math.round(slowest.ms)} ms`,
    );
  } finally {
    globalThis.fetch = realFetch;
  }
});
