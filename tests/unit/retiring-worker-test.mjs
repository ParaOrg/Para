// The map's offline worker retired on the production site: which hosts get it in /sw.js's place,
// how it is sent, and what it does when it runs, against stand-ins for the worker's globals.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/retiring-worker-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';

import { runtimeCaches } from '../../scripts/node/offline-worker-caches.ts';
import { basemapCacheRules } from '../../src/shared/config/basemap-cache-rules.ts';
import { servePage } from '../../workers/site/src/coming-soon.ts';
import {
  MAP_CACHES,
  RETIRING_WORKER,
  retiringWorkerResponse,
} from '../../workers/site/src/retiring-worker.ts';

/** A stand-in for the assets binding that answers every address with the real worker's file. */
function assets() {
  const asked = [];
  return {
    asked,
    fetch: async (request) => {
      asked.push(new URL(request.url).pathname);
      return new Response('the real worker', { headers: { 'content-type': 'text/javascript' } });
    },
  };
}

test('on the production site, /sw.js is the retiring worker, and the built file is not asked for', async () => {
  for (const host of [
    'www.para-commute.org',
    'para-commute.org',
    'para.para-ph-info.workers.dev',
  ]) {
    const binding = assets();
    const response = await servePage(new Request(`https://${host}/sw.js`), binding);
    assert.equal(await response.text(), RETIRING_WORKER, host);
    assert.deepEqual(binding.asked, [], host);
  }
});

test('every Preview, staging among them, keeps the real worker', async () => {
  for (const host of [
    'staging-para.para-ph-info.workers.dev',
    'claude-retire-pwa-para.para-ph-info.workers.dev',
  ]) {
    const binding = assets();
    const response = await servePage(new Request(`https://${host}/sw.js`), binding);
    assert.equal(await response.text(), 'the real worker', host);
    assert.deepEqual(binding.asked, ['/sw.js'], host);
  }
});

test('it is sent as a script that no cache keeps, so every update check reaches the site', () => {
  const response = retiringWorkerResponse();
  assert.equal(response.headers.get('content-type'), 'text/javascript; charset=utf-8');
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test("it deletes each of the map worker's own stores, by the names that worker gives them", () => {
  const named = runtimeCaches(basemapCacheRules('https://tiles.openfreemap.org')).map(
    (rule) => rule.options?.cacheName,
  );
  assert.deepEqual([...MAP_CACHES].sort(), [...named].sort());
});

/** Runs the worker's script against stand-ins for its globals, then installs and activates it. */
async function runWorker({ caches, windows }) {
  const listeners = {};
  const log = { skipWaiting: 0, claimed: 0, unregistered: 0, navigated: [], deleted: [] };
  const self = {
    addEventListener: (type, listener) => (listeners[type] = listener),
    skipWaiting: async () => void log.skipWaiting++,
    clients: {
      claim: async () => void log.claimed++,
      matchAll: async (options) => {
        assert.equal(options.type, 'window');
        return windows.map((url) => ({ url, navigate: async (to) => void log.navigated.push(to) }));
      },
    },
    registration: { unregister: async () => void log.unregistered++ },
  };
  const cacheStorage = {
    keys: async () => [...caches],
    delete: async (name) => void log.deleted.push(name),
  };
  runInNewContext(RETIRING_WORKER, { self, caches: cacheStorage, URL });
  listeners.install({});
  let done;
  listeners.activate({ waitUntil: (promise) => (done = promise) });
  await done;
  return log;
}

test('installed, it takes over at once, empties the map’s stores and no other, and removes itself', async () => {
  const log = await runWorker({
    caches: [
      'workbox-precache-v2-https://www.para-commute.org/',
      ...MAP_CACHES,
      'para-ph-tiles',
      'para-contribute-abc123',
      'something-else',
    ],
    windows: [],
  });
  assert.equal(log.skipWaiting, 1);
  assert.equal(log.claimed, 1);
  assert.deepEqual(
    log.deleted.sort(),
    ['workbox-precache-v2-https://www.para-commute.org/', ...MAP_CACHES, 'para-ph-tiles'].sort(),
  );
  assert.equal(log.unregistered, 1);
});

test("it reloads the map's open windows, but not the editor's nor the contributor page's", async () => {
  const log = await runWorker({
    caches: [],
    windows: [
      'https://www.para-commute.org/',
      'https://www.para-commute.org/?route=12',
      'https://www.para-commute.org/studio/',
      'https://www.para-commute.org/studio',
      'https://www.para-commute.org/contribute/',
    ],
  });
  assert.deepEqual(log.navigated, [
    'https://www.para-commute.org/',
    'https://www.para-commute.org/?route=12',
  ]);
});
