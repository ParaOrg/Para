// The contributor app's basemap cache (src/features/contribute/map/basemap-cache.ts): the map's
// requests for the basemap host's files go through it, with the public map's offline rules. Tiles
// from the cache first, while they are under 30 days old; the style's other files from the cache at
// once, refreshed behind it; everything else never meets it. Run on a stand-in Cache Storage.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/basemap-cache-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { basemapCache } from '../../src/features/contribute/map/basemap-cache.ts';

const HOST = 'https://tiles.openfreemap.org';
const TILE = `${HOST}/planet/20261101_001001_pt/14/13700/7600.pbf`;
const TILEJSON = `${HOST}/planet`;
const DAY = 24 * 60 * 60 * 1000;

/** A stand-in Cache Storage and network for one test; `answer` is the network's, null for none. */
async function withPhone(answer, run) {
  const stores = new Map();
  const realCaches = globalThis.caches;
  const realFetch = globalThis.fetch;
  const asked = [];
  globalThis.caches = {
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        match: async (url) => store.get(url)?.clone(),
        put: async (url, response) => void store.set(url, response),
        keys: async () => [...store.keys()],
        delete: async (url) => store.delete(url),
      };
    },
  };
  globalThis.fetch = async (url) => {
    asked.push(url);
    const body = answer(url);
    if (body === null) throw new TypeError('Failed to fetch');
    return new Response(body, { status: 200 });
  };
  try {
    return await run({ asked, stores });
  } finally {
    globalThis.caches = realCaches;
    globalThis.fetch = realFetch;
  }
}

const through = (cache, url, type = 'arrayBuffer') =>
  cache.load({ url: cache.transformRequest(url).url, type }, new AbortController());
const text = (buffer) => new TextDecoder().decode(buffer);
/** The copies kept are put behind the answer: a turn for them to land. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

test("only the basemap host's tiles and files go through it; nothing else is touched", async () => {
  await withPhone(
    () => 'x',
    async () => {
      const cache = basemapCache(HOST);
      assert.match(cache.transformRequest(TILE).url, /^para-basemap:\/\/https:\/\//);
      assert.ok(cache.transformRequest(`${HOST}/fonts/Noto%20Sans%20Regular/0-255.pbf`));
      assert.equal(cache.transformRequest('https://example.com/a.pbf'), undefined);
      assert.equal(cache.transformRequest('https://localhost/data/lines/a.json'), undefined);
    },
  );
});

test('a tile seen once comes from the phone, with no signal and without asking the network', async () => {
  let isOnline = true;
  await withPhone(
    () => (isOnline ? 'tile' : null),
    async ({ asked }) => {
      const cache = basemapCache(HOST);
      assert.equal(text((await through(cache, TILE)).data), 'tile');
      await settle();
      isOnline = false;
      assert.equal(text((await through(cache, TILE)).data), 'tile');
      assert.deepEqual(asked, [TILE], 'asked of the network once only');
    },
  );
});

test('a tile older than 30 days is asked again, and kept if no signal answers', async () => {
  let now = 0;
  let answer = 'old';
  await withPhone(
    () => answer,
    async ({ asked }) => {
      const cache = basemapCache(HOST, () => now);
      await through(cache, TILE);
      await settle();
      now = 31 * DAY;
      answer = 'new';
      assert.equal(text((await through(cache, TILE)).data), 'new');
      await settle();
      now = 62 * DAY;
      answer = null;
      assert.equal(text((await through(cache, TILE)).data), 'new', 'the old copy, with no signal');
      assert.equal(asked.length, 3);
    },
  );
});

test('a tile never seen, with no signal, fails as a request does', async () => {
  await withPhone(
    () => null,
    async () => {
      await assert.rejects(through(basemapCache(HOST), TILE));
    },
  );
});

test('the TileJSON comes from the copy at once, and is refreshed behind it', async () => {
  let answer = '{"v":1}';
  await withPhone(
    () => answer,
    async ({ asked }) => {
      const cache = basemapCache(HOST);
      assert.deepEqual((await through(cache, TILEJSON, 'json')).data, { v: 1 });
      await settle();
      answer = '{"v":2}';
      assert.deepEqual((await through(cache, TILEJSON, 'json')).data, { v: 1 }, 'the copy first');
      await settle();
      assert.deepEqual((await through(cache, TILEJSON, 'json')).data, { v: 2 }, 'then the refresh');
      answer = null;
      await settle();
      assert.deepEqual((await through(cache, TILEJSON, 'json')).data, { v: 2 }, 'kept offline');
      assert.equal(asked.length, 4);
    },
  );
});

test('the tiles are trimmed to the public map’s 1,000, the oldest first', async () => {
  await withPhone(
    () => 'tile',
    async ({ stores }) => {
      const cache = basemapCache(HOST);
      for (let x = 0; x < 1050; x++) {
        await through(cache, `${HOST}/planet/v/14/${x}/7600.pbf`);
        await settle();
      }
      const tiles = stores.get('para-basemap-tiles-v1');
      assert.equal(tiles.size, 1000);
      assert.ok(!tiles.has(`${HOST}/planet/v/14/0/7600.pbf`));
      assert.ok(tiles.has(`${HOST}/planet/v/14/1049/7600.pbf`));
    },
  );
});

test("a design switched to with no signal is drawn from the app's copy of its style", async () => {
  const STYLE = `${HOST}/styles/liberty`;
  const copy = { version: 8, sources: {}, layers: [] };
  await withPhone(
    () => null,
    async () => {
      const cache = basemapCache(HOST, Date.now, async (url) => (url === STYLE ? copy : null));
      assert.deepEqual((await through(cache, STYLE, 'json')).data, copy);
      // A file that is no design's style still fails as a request does.
      await assert.rejects(through(cache, TILEJSON, 'json'));
    },
  );
});
