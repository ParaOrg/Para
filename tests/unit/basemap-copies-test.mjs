// The contributor app's copies of the basemaps' styles, for a map made with no signal
// (src/features/contribute/map/basemap-copies.ts): the one last fetched on the phone, else the
// one the app was built with, else a flat map; never a failure.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/basemap-copies-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BASEMAP_COPIES,
  FLAT_STYLE,
  styleWithCopies,
} from '../../src/features/contribute/map/basemap-copies.ts';
import { BASEMAPS } from '../../src/features/routes/map/basemap.ts';

const POSITRON = {
  id: 'positron',
  label: 'Monochrome',
  url: 'https://tiles.example/styles/positron',
};
const style = (id) => ({ version: 8, sources: {}, layers: [{ id, type: 'background' }] });

/** A phone's storage, and the app's own files answering `builtIn` (or failing), for one test. */
async function onPhone({ stored = {}, builtIn, online = null }, run) {
  const isOnline = { now: online !== null };
  const items = new Map(Object.entries(stored));
  const realStorage = globalThis.localStorage;
  const realFetch = globalThis.fetch;
  const asked = [];
  globalThis.localStorage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
  };
  globalThis.fetch = async (url) => {
    asked.push(url);
    if (url.startsWith('https://') && !isOnline.now) throw new TypeError('Failed to fetch');
    if (url.startsWith('https://')) return new Response(JSON.stringify(online));
    if (builtIn instanceof Error) throw builtIn;
    return builtIn === undefined
      ? new Response('', { status: 404 })
      : new Response(JSON.stringify(builtIn));
  };
  // The warnings each fallback says are expected here.
  const realWarn = console.warn;
  console.warn = () => {};
  try {
    return await run({ items, asked });
  } finally {
    globalThis.localStorage = realStorage;
    globalThis.fetch = realFetch;
    console.warn = realWarn;
  }
}

test('a style kept on the phone comes first, without asking the app for its own', async () => {
  await onPhone({ builtIn: style('built-in') }, async ({ asked }) => {
    BASEMAP_COPIES.keep(POSITRON, style('kept'));
    assert.deepEqual(await BASEMAP_COPIES.offline(POSITRON), style('kept'));
    assert.deepEqual(asked, []);
  });
});

test('with none kept, the one the app was built with, from its own files', async () => {
  await onPhone({ builtIn: style('built-in') }, async ({ asked }) => {
    assert.deepEqual(await BASEMAP_COPIES.offline(POSITRON), style('built-in'));
    assert.deepEqual(asked, ['/basemap-styles/positron.json']);
  });
});

test('a kept copy that is not a style is passed over for the built-in one', async () => {
  const stored = { 'para.basemap-copy.v1.positron': '{"version":7}' };
  await onPhone({ stored, builtIn: style('built-in') }, async () => {
    assert.deepEqual(await BASEMAP_COPIES.offline(POSITRON), style('built-in'));
  });
});

test('with no copy at all, or none readable, the map is flat: no roads, labels or 3D', async () => {
  for (const builtIn of [undefined, { version: 7 }, new Error('unreadable')]) {
    await onPhone(
      { stored: { 'para.basemap-copy.v1.positron': 'not json' }, builtIn },
      async () => {
        assert.deepEqual(await BASEMAP_COPIES.offline(POSITRON), FLAT_STYLE);
      },
    );
  }
  assert.deepEqual(FLAT_STYLE, { version: 8, sources: {}, layers: [] });
});

test('the map is made with the style fetched, kept as fetched, undressed, a plain design too', async () => {
  const plain = BASEMAPS.find((b) => !b.dressing);
  const fetched = style('fetched');
  await onPhone({ online: fetched }, async ({ items }) => {
    const drawn = await styleWithCopies(plain, true);
    assert.ok(drawn.layers.some((l) => l.id === 'fetched'));
    assert.deepEqual(JSON.parse(items.get(`para.basemap-copy.v1.${plain.id}`)), fetched);
  });
});

test('with no signal the map is made from the copy, dressed, and nothing is kept', async () => {
  const monochrome = BASEMAPS.find((b) => b.dressing === 'monochrome');
  await onPhone({ builtIn: style('built-in') }, async ({ items }) => {
    const drawn = await styleWithCopies(monochrome, false);
    assert.equal(drawn.version, 8);
    assert.ok(drawn.layers.some((l) => l.id === 'built-in'));
    assert.equal(items.size, 0);
  });
});
