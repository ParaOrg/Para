// The newest older published shape a reader can fall back to (src/features/routes/published/older-index.ts):
// the contributor app reads the public site, which serves a new map file only once the release
// that writes it reaches main. Until then the app reads the newest older shape the site has.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/older-index-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readOlderIndex } from '../../src/features/routes/published/older-index.ts';
import { STORED_OLD } from '../../src/features/routes/published/map-file.ts';

const committed = (name) =>
  JSON.parse(readFileSync(new URL(`../../public/data/${name}`, import.meta.url), 'utf8'));
/** A site that serves these paths, and answers its HTML page for any other, as the host does. */
const site = (files) => async (url) => {
  if (url in files) return files[url];
  throw new SyntaxError(`Unexpected token '<', "<!doctype "... is not valid JSON`);
};

test('the newest older shape is read first: shape 5 before shape 4', async () => {
  assert.equal(STORED_OLD[0].url, '/data/index.v5.json');
  const read = site({
    '/data/index.v5.json': committed('index.v5.json'),
    '/data/index.v4.json': committed('index.v4.json'),
  });
  const index = await readOlderIndex(read);
  assert.equal(index?.schema, 5);
  assert.equal(index?.directions.length, committed('index.v5.json').variants.length);
});

test('a shape the site does not serve, or that does not read, is passed over', async () => {
  const read = site({
    '/data/index.v5.json': { schema: 5, hello: 'world' },
    '/data/index.v4.json': committed('index.v4.json'),
  });
  assert.equal((await readOlderIndex(read))?.schema, 4);
});

test('none at all is null, so the caller throws its own error', async () => {
  assert.equal(await readOlderIndex(site({})), null);
});
