// The contributor page's service worker, scoped to /contribute/. Hand-written and small:
// it keeps the page and the chunks it loads, so the page opens and records with no
// signal. The build (scripts/node/contribute-worker.ts) adds the two constants below,
// cut from Vite's manifest, and writes the result to dist/contribute/sw.js. It holds no
// data and no map tiles: a recording lives in IndexedDB, and the page runs without a basemap.

interface ExtendableEventLike extends Event {
  waitUntil(promise: Promise<unknown>): void;
}
interface FetchEventLike extends ExtendableEventLike {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
}
interface MessageEventLike extends ExtendableEventLike {
  readonly data: unknown;
}
interface WorkerScope {
  addEventListener(
    type: 'install' | 'activate',
    listener: (event: ExtendableEventLike) => void,
  ): void;
  addEventListener(type: 'fetch', listener: (event: FetchEventLike) => void): void;
  addEventListener(type: 'message', listener: (event: MessageEventLike) => void): void;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
}

// Shadows the DOM's `self`: the file is a worker, and tsc checks it with the page's types.
declare const self: WorkerScope;
/** Every path the page needs, the page itself first. Added by the build. */
declare const PRECACHE_URLS: readonly string[];
/** Named for what is in it, so a new build gets a store of its own. Added by the build. */
declare const CACHE_NAME: string;

const CACHE_PREFIX = 'para-contribute-';
// The stores a build made while the app was called ParaPo, still on a test phone.
const OLD_NAME_PREFIX = 'parapo-contribute-';
const PAGE_URL = '/contribute/';
const PRECACHED = new Set(PRECACHE_URLS);

async function precache(): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    PRECACHE_URLS.map(async (url) => {
      // The page has no hash in its name, so it is asked of the network, not the browser's copy.
      const response = await fetch(url, url === PAGE_URL ? { cache: 'reload' } : undefined);
      // A file the host no longer has is answered with the map's page, 200 (wrangler.jsonc):
      // keeping that as a chunk would break the page offline for good.
      const isHtml = (response.headers.get('content-type') ?? '').startsWith('text/html');
      if (!response.ok || (isHtml && url !== PAGE_URL)) {
        throw new Error(`${url} could not be stored for offline: HTTP ${response.status}`);
      }
      await cache.put(url, response);
    }),
  );
}

async function forgetOlderStores(): Promise<void> {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter(
        (name) =>
          (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) ||
          name.startsWith(OLD_NAME_PREFIX),
      )
      .map((name) => caches.delete(name)),
  );
}

async function answer(key: string, request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  return (await cache.match(key)) ?? fetch(request);
}

function isSkipWaiting(data: unknown): boolean {
  return (
    typeof data === 'object' && data !== null && 'type' in data && data.type === 'SKIP_WAITING'
  );
}

// Nothing skips the wait on install: a new version waits, so an update never replaces the
// files under a recording. The page sends SKIP_WAITING when no recording is open.
self.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(forgetOlderStores().then(() => self.clients.claim()));
});

self.addEventListener('message', (event) => {
  if (isSkipWaiting(event.data)) event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (request.mode === 'navigate') {
    if (url.pathname === PAGE_URL) event.respondWith(answer(PAGE_URL, request));
  } else if (PRECACHED.has(url.pathname)) {
    event.respondWith(answer(url.pathname, request));
  }
});
