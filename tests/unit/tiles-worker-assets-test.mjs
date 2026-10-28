// The tiles Worker's /assets route: encoded font names, fontstack fallback, the flat sprite.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/tiles-worker-assets-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../../workers/tiles/src/app.ts';
import { assetKeys } from '../../workers/tiles/src/assets.ts';
import { fakeBucket } from './tiles-worker-fixture.mjs';

const OWN = 'https://tiles.example';

const CURRENT = JSON.stringify({ file: 'parapo-2026-10-27.pmtiles', builtAt: 'x' });

async function get(path, files, headers = {}) {
  globalThis.caches = undefined;
  const all = { 'tiles/current.json': CURRENT, ...files };
  const bucket = fakeBucket(new Map(Object.entries(all).map(([k, v]) => [k, Buffer.from(v)])));
  return createApp()(
    new Request(`${OWN}${path}`, { headers }),
    { TILES: bucket },
    { waitUntil() {} },
  );
}

test('a font name with spaces is decoded before it becomes the bucket key', async () => {
  const response = await get('/assets/fonts/Noto%20Sans%20Regular/0-255.pbf', {
    'assets/fonts/Noto Sans Regular/0-255.pbf': 'glyphs',
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'glyphs');
});

test('a fontstack is tried font by font and the first one the bucket holds is served', async () => {
  const path = '/assets/fonts/Noto%20Sans%20Bold,Noto%20Sans%20Regular/0-255.pbf';
  const onlyRegular = await get(path, { 'assets/fonts/Noto Sans Regular/0-255.pbf': 'regular' });
  assert.equal(await onlyRegular.text(), 'regular');
  const both = await get(path, {
    'assets/fonts/Noto Sans Regular/0-255.pbf': 'regular',
    'assets/fonts/Noto Sans Bold/0-255.pbf': 'bold',
  });
  assert.equal(await both.text(), 'bold');
});

test('a fontstack with no font in the bucket is 404', async () => {
  const response = await get('/assets/fonts/Nope,Also%20Nope/0-255.pbf', {});
  assert.equal(response.status, 404);
});

test('a fontstack is read only to its third font', async () => {
  const stack = '/assets/fonts/A,B,C,D/0-255.pbf';
  const third = await get(stack, { 'assets/fonts/C/0-255.pbf': 'c' });
  assert.equal(await third.text(), 'c');
  const fourth = await get(stack, { 'assets/fonts/D/0-255.pbf': 'd' });
  assert.equal(fourth.status, 404);
});

test('an asset is answered 304 to a request that holds its etag, weak or in a list', async () => {
  const files = { 'assets/sprites/ofm.json': '{}' };
  const first = await get('/assets/sprites/ofm.json', files);
  const etag = first.headers.get('ETag');
  assert.ok(etag);
  for (const header of [etag, `W/${etag}`, `"other", ${etag}`, '*']) {
    const response = await get('/assets/sprites/ofm.json', files, { 'If-None-Match': header });
    assert.equal(response.status, 304, header);
  }
});

test('the sprite files are served flat, with their own types', async () => {
  const files = { 'assets/sprites/ofm.json': '{}', 'assets/sprites/ofm@2x.png': 'png' };
  const json = await get('/assets/sprites/ofm.json', files);
  assert.equal(json.headers.get('Content-Type'), 'application/json');
  const png = await get('/assets/sprites/ofm@2x.png', files);
  assert.equal(png.headers.get('Content-Type'), 'image/png');
});

test('paths outside assets/, with .. or with a broken escape are no assets', () => {
  assert.equal(assetKeys('/tiles/current.json'), undefined);
  assert.equal(assetKeys('/assets/../tiles/current.json'), undefined);
  assert.equal(assetKeys('/assets/%2e%2e/tiles/current.json'), undefined);
  assert.equal(assetKeys('/assets/fonts/%E0%A4%A/0-255.pbf'), undefined);
});
