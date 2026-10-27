// The tiles Worker's PMTiles reading in the cases a plain file does not reach: runs, the compact
// offset form, directories two levels deep, a replaced file, a file it cannot serve.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/tiles-worker-archive-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { tileIdToZxy } from '../../scripts/research/tiles-pmtiles.mjs';
import { createApp } from '../../workers/tiles/src/app.ts';
import { buildPmtiles, fakeBucket, tileBody } from './tiles-worker-fixture.mjs';

const FILE = 'parapo-2026-10-27.pmtiles';
const ORIGIN = 'https://tiles.example';

function serve(pmtiles, extra = {}) {
  globalThis.caches = undefined;
  const files = new Map([
    ['tiles/current.json', Buffer.from(JSON.stringify({ file: FILE, builtAt: 'x', tiles: 1 }))],
    ...(pmtiles ? [[`tiles/${FILE}`, pmtiles]] : []),
  ]);
  const bucket = fakeBucket(files);
  const app = createApp();
  const get = (path) =>
    app(new Request(`${ORIGIN}${path}`), { TILES: bucket, ...extra }, { waitUntil() {} });
  return { bucket, get };
}

const some = (count) => Array.from({ length: count }, (_, i) => [4, i, 3]);

test('a run of tiles sharing one entry is found at every id in the run, and not past it', async () => {
  const run = [22, 23, 24].map((id) => [...tileIdToZxy(id), 'shared bytes']);
  const tiles = [[3, 0, 0], ...run, [3, 7, 7]];
  const { get } = serve(buildPmtiles(tiles, { leafSize: 8 }));
  for (const [z, x, y] of run) {
    const response = await get(`/${z}/${x}/${y}.pbf`);
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), tileBody(z, x, y, 'shared bytes'));
  }
  const [z, x, y] = tileIdToZxy(25);
  assert.equal((await get(`/${z}/${x}/${y}.pbf`)).status, 204);
});

test('offsets written in the compact form (0 = right after the previous tile) are read', async () => {
  const tiles = some(7);
  const { get } = serve(buildPmtiles(tiles, { leafSize: 4, contiguousOffsets: true }));
  for (const [z, x, y] of tiles) {
    const response = await get(`/${z}/${x}/${y}.pbf`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), tileBody(z, x, y), `${x}`);
  }
});

test('a leaf directory that points at more leaf directories is walked', async () => {
  const tiles = some(12);
  const { get } = serve(buildPmtiles(tiles, { leafSize: 2, levels: 2 }));
  for (const [z, x, y] of tiles) {
    const response = await get(`/${z}/${x}/${y}.pbf`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), tileBody(z, x, y), `${x}`);
  }
  assert.equal((await get('/4/13/3.pbf')).status, 204);
});

test('current.json naming a file that is not in the bucket is 503, for health and tiles', async () => {
  const { get } = serve(undefined);
  assert.equal((await get('/health')).status, 503);
  assert.equal((await get('/0/0/0.pbf')).status, 503);
});

test('a file replaced under the same name is reopened, not mixed with the old one', async () => {
  const tiles = [
    [3, 0, 0],
    [3, 1, 1],
    [3, 2, 2],
  ];
  const { get, bucket } = serve(buildPmtiles(tiles.map(([z, x, y]) => [z, x, y, 'old'])));
  const before = await get('/3/0/0.pbf');
  assert.deepEqual(Buffer.from(await before.arrayBuffer()), tileBody(3, 0, 0, 'old'));
  bucket.replace(`tiles/${FILE}`, buildPmtiles(tiles.map(([z, x, y]) => [z, x, y, 'new bytes'])));
  const after = await get('/3/2/2.pbf');
  assert.equal(after.status, 200);
  assert.deepEqual(Buffer.from(await after.arrayBuffer()), tileBody(3, 2, 2, 'new bytes'));
});

test('a file with a compression or tile type it cannot serve is 503, not garbage', async () => {
  for (const [at, value] of [
    [98, 3],
    [97, 0],
    [99, 2],
  ]) {
    const file = buildPmtiles(some(3));
    file[at] = value;
    const { get } = serve(file);
    assert.equal((await get('/4/0/3.pbf')).status, 503, `byte ${at} = ${value}`);
  }
});
