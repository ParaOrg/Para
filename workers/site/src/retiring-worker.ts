/**
 * The public map's offline worker, retired on the production site. A phone that installed the map
 * (the PWA) opens it from the worker's own store, so Coming soon alone never reaches it. The
 * browser re-checks /sw.js on its own (on a navigation or the page's hourly check, and at least
 * once a day), and on the production site this is what it finds: a worker that takes over at
 * once, deletes the map's stores, removes itself, and reloads the map's open windows, which then
 * reach the network and Coming soon.
 *
 * It answers no requests (no fetch handler), so while it runs everything goes to the network.
 * The contributor page is left alone: it has its own worker (/contribute/sw.js, scope
 * /contribute/) and its own stores (`para-contribute-*`), and a window there is controlled by that
 * worker, not this one. The editor's windows are not reloaded, so no unsaved edit is lost; they
 * stop being controlled by the next time they load.
 */

/**
 * The stores the public map's worker keeps as it is used (scripts/node/offline-worker-caches.ts,
 * each `cacheName`). tests/unit/retiring-worker-test.mjs checks this list against that file.
 */
export const MAP_CACHES = [
  'map-file',
  'map-lines',
  'signboards',
  'landmarks',
  'footbridges',
  'basemap-meta',
  'basemap-tiles',
] as const;

/**
 * What a store's name starts with when Workbox made it (the precache, `workbox-precache-v2-…`), or
 * when the app this address served before made it (`para-ph-…`, public/old-app-cleanup.js).
 */
export const MAP_CACHE_PREFIXES = ['workbox-', 'para-ph-'] as const;

/** The pages whose windows are not reloaded: the editor's and the contributor page's. */
const KEPT_PATHS = ['/studio', '/contribute'] as const;

/** The worker's script, served as /sw.js on the production site. */
export const RETIRING_WORKER = `// Para's map is not on show yet: this worker removes the installed copy.
const MAP_CACHES = ${JSON.stringify(MAP_CACHES)};
const MAP_CACHE_PREFIXES = ${JSON.stringify(MAP_CACHE_PREFIXES)};
const KEPT_PATHS = ${JSON.stringify(KEPT_PATHS)};

const isMapCache = (name) =>
  MAP_CACHES.includes(name) || MAP_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix));

const isKept = (url) => {
  const { pathname } = new URL(url);
  return KEPT_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'));
};

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const names = await caches.keys();
      await Promise.all(names.filter(isMapCache).map((name) => caches.delete(name)));
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: 'window' });
      await Promise.all(
        windows.filter((client) => !isKept(client.url)).map((client) => client.navigate(client.url)),
      );
    })(),
  );
});
`;

/** The answer to /sw.js on the production site: never stored, so the browser always re-checks. */
export function retiringWorkerResponse(): Response {
  return new Response(RETIRING_WORKER, {
    headers: {
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': 'no-cache, no-store, must-revalidate',
      'x-content-type-options': 'nosniff',
    },
  });
}
