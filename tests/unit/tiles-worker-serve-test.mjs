// The tiles Worker end to end over a generated PMTiles file in a fake bucket: the directory
// walk through leaf directories, a 204 for a missing tile, 400 for a bad address, caching.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/tiles-worker-serve-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../../workers/tiles/src/app.ts';
import { buildPmtiles, fakeBucket, fakeCache, tileBody } from './tiles-worker-fixture.mjs';

const FILE = 'parapo-2026-10-27.pmtiles';
const TILES = [
  [0, 0, 0],
  [1, 0, 0],
  [2, 1, 1],
  [3, 2, 3],
  [3, 5, 4],
  [4, 9, 6],
  [4, 9, 7],
];
const ORIGIN = 'https://tiles.example';
const ctx = { waitUntil: () => {} };

function setup({ withCache = false } = {}) {
  const files = new Map([
    [`tiles/${FILE}`, buildPmtiles(TILES)],
    [
      'tiles/current.json',
      Buffer.from(
        JSON.stringify({
          file: FILE,
          builtAt: '2026-10-27T01:00:00Z',
          bytes: 1,
          tiles: TILES.length,
        }),
      ),
    ],
  ]);
  const bucket = fakeBucket(files);
  const cache = fakeCache();
  globalThis.caches = withCache ? { default: cache } : undefined;
  const app = createApp();
  const get = (path, headers = {}) =>
    app(new Request(`${ORIGIN}${path}`, { headers }), { TILES: bucket }, ctx);
  return { bucket, cache, get };
}

test('every tile in the file is found through the leaf directories, byte for byte', async () => {
  const { get } = setup();
  for (const [z, x, y] of TILES) {
    const response = await get(`/${z}/${x}/${y}.pbf`);
    assert.equal(response.status, 200, `${z}/${x}/${y}`);
    assert.equal(response.headers.get('Content-Encoding'), 'gzip');
    assert.equal(response.headers.get('Content-Type'), 'application/x-protobuf');
    assert.equal(
      response.headers.get('Cache-Control'),
      'public, max-age=86400, stale-while-revalidate=604800',
    );
    assert.equal(response.headers.get('ETag'), `"${FILE}"`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), tileBody(z, x, y));
  }
});

test('a tile the file does not hold is 204, with no body', async () => {
  const { get } = setup();
  for (const path of ['/3/0/0.pbf', '/4/9/8.pbf', '/2/3/3.pbf', '/9/1/1.pbf']) {
    const response = await get(path);
    assert.equal(response.status, 204, path);
    assert.equal(await response.text(), '');
  }
});

test('an address that is no tile is 400', async () => {
  const { get } = setup();
  for (const path of ['/0/1/0.pbf', '/3/8/0.pbf', '/30/0/0.pbf']) {
    assert.equal((await get(path)).status, 400, path);
  }
  assert.equal((await get('/3/1.pbf')).status, 404);
});

test('the file and its directories are read once, not once per tile', async () => {
  const { get, bucket } = setup();
  await get('/3/2/3.pbf');
  const afterFirst = bucket.reads.length;
  await get('/3/5/4.pbf');
  await get('/3/2/3.pbf');
  const rangeReads = bucket.reads.filter((key) => key === `tiles/${FILE}`).length;
  assert.equal(bucket.reads.filter((key) => key === 'tiles/current.json').length, 1);
  assert.ok(afterFirst <= 4);
  assert.ok(rangeReads <= 4 + 2 * 2, `${rangeReads} reads of the file`);
});

test('with the edge cache, a second request for a tile does not touch R2', async () => {
  const { get, bucket } = setup({ withCache: true });
  const first = await get('/4/9/6.pbf');
  const reads = bucket.reads.length;
  const second = await get('/4/9/6.pbf');
  assert.equal(bucket.reads.length, reads);
  assert.deepEqual(Buffer.from(await second.arrayBuffer()), Buffer.from(await first.arrayBuffer()));
  assert.equal(second.headers.get('Content-Encoding'), 'gzip');
});

test('If-None-Match with the file etag answers 304', async () => {
  const { get } = setup();
  const response = await get('/2/1/1.pbf', { 'If-None-Match': `"${FILE}"` });
  assert.equal(response.status, 304);
});

test('/health says which file is live and when it was built', async () => {
  const { get } = setup();
  const response = await get('/health');
  assert.deepEqual(await response.json(), {
    builtAt: '2026-10-27T01:00:00Z',
    file: FILE,
    tiles: TILES.length,
  });
});

test('before anything is published the answer is 503, not a crash', async () => {
  globalThis.caches = undefined;
  const app = createApp();
  const response = await app(
    new Request(`${ORIGIN}/health`),
    { TILES: fakeBucket(new Map()) },
    ctx,
  );
  assert.equal(response.status, 503);
});
