import type { VitePWAOptions } from 'vite-plugin-pwa';

import type { BasemapCacheRules } from './basemap-offline.ts';

type RuntimeCaching = NonNullable<NonNullable<VitePWAOptions['workbox']>['runtimeCaching']>;

/**
 * What the public map's offline worker keeps as it is used: the published map's
 * index, its lines and signboards, and the basemap's files and tiles. Workbox
 * copies each `urlPattern` function into the worker as text, so none of them may
 * reach a value outside itself; the basemap's host travels in its rules' regular
 * expressions instead.
 */
export function runtimeCaches(basemapRules: BasemapCacheRules): RuntimeCaching {
  return [
    {
      // The published map's index: fresh when the network answers in
      // time, the last copy otherwise. Only GET, only this file — the
      // studio's database reads share the origin and must never come
      // from here. (Shapes 1 to 4, /data/map.json, /data/index.json,
      // /data/index.v3.json and /data/index.v4.json, are older apps', each
      // read through its own worker; an older copy left in this store is
      // the offline map until the new one is fetched, map-file.ts's
      // STORED_OLD. maxEntries 1 drops it only when the new one is stored.)
      urlPattern: ({ url, request }) =>
        request.method === 'GET' &&
        url.origin === self.location.origin &&
        url.pathname === '/data/index.v5.json',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'map-file',
        networkTimeoutSeconds: 3,
        // Only a real 200. Nothing here is fetched opaque (same origin,
        // and MapLibre asks with CORS), and Chrome charges an opaque
        // entry several MB of quota.
        cacheableResponse: { statuses: [200] },
        expiration: { maxEntries: 1 },
        plugins: [
          {
            // Only JSON. The host answers a missing file with the
            // map's page, 200 (wrangler.jsonc, single-page-application),
            // and a 200 alone would keep that page as the map. Inline: the
            // worker is written from this.
            cacheWillUpdate: async ({ response }) =>
              (response.headers.get('content-type') ?? '').startsWith('application/json')
                ? response
                : null,
          },
          {
            // Stamp what comes from the store, so the page can say
            // "Not refreshed" honestly even while the phone believes it
            // is online (a slow network answered after the timeout).
            cachedResponseWillBeUsed: async ({ cachedResponse }) => {
              if (!cachedResponse) return null;
              const headers = new Headers(cachedResponse.headers);
              headers.set('x-para-served-from', 'cache');
              return new Response(cachedResponse.body, {
                status: cachedResponse.status,
                statusText: cachedResponse.statusText,
                headers,
              });
            },
          },
        ],
      },
    },
    {
      // A direction's full line, read when it is lit or opened: fresh
      // when the network answers in time, else the copy kept — every
      // line seen stays, so offline keeps what was ridden. A line is
      // 1 kB or so over the wire; the cap is the whole map, twice.
      urlPattern: ({ url, request }) =>
        request.method === 'GET' &&
        url.origin === self.location.origin &&
        url.pathname.startsWith('/data/lines/'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'map-lines',
        networkTimeoutSeconds: 3,
        cacheableResponse: { statuses: [200] },
        expiration: { maxEntries: 4000, purgeOnQuotaError: true },
        plugins: [
          {
            // Only JSON: a line not there is the map's page, 200 (above).
            // A page an older worker kept is passed over, not served.
            cacheWillUpdate: async ({ response }) =>
              (response.headers.get('content-type') ?? '').startsWith('application/json')
                ? response
                : null,
            cachedResponseWillBeUsed: async ({ cachedResponse }) =>
              cachedResponse &&
              (cachedResponse.headers.get('content-type') ?? '').startsWith('application/json')
                ? cachedResponse
                : null,
          },
        ],
      },
    },
    {
      // A direction's signboards (0010): from the cache once seen, as a
      // board's name is a new uuid whenever it changes — so a board
      // ridden with stays offline. A few kB each.
      urlPattern: ({ url, request }) =>
        request.method === 'GET' &&
        url.origin === self.location.origin &&
        url.pathname.startsWith('/data/signboards/'),
      handler: 'CacheFirst',
      options: {
        cacheName: 'signboards',
        cacheableResponse: { statuses: [200] },
        expiration: { maxEntries: 2000, purgeOnQuotaError: true },
        plugins: [
          {
            // Only an SVG: a board not there is the map's page, 200,
            // and cache-first would have kept it under that name for
            // good. A page an older worker kept so is passed over, and
            // the board asked of the network again.
            cacheWillUpdate: async ({ response }) =>
              (response.headers.get('content-type') ?? '').startsWith('image/svg+xml')
                ? response
                : null,
            cachedResponseWillBeUsed: async ({ cachedResponse }) =>
              cachedResponse &&
              (cachedResponse.headers.get('content-type') ?? '').startsWith('image/svg+xml')
                ? cachedResponse
                : null,
          },
        ],
      },
    },
    {
      // Style, TileJSON, sprites, glyphs: served from the cache at once,
      // refreshed behind it. Glyphs are one entry per font and 256-glyph
      // range, and Liberty uses three faces, so the cap is roomy.
      urlPattern: basemapRules.meta,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'basemap-meta',
        cacheableResponse: { statuses: [200] },
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          purgeOnQuotaError: true,
        },
      },
    },
    {
      // Tiles: places already viewed work offline. The vector source
      // stops at zoom 14, where a central-Manila tile is ~450 kB stored,
      // and Metro Manila is about 110 such tiles: a normal commuter keeps
      // 30–100 MB, and 1,000 entries is a ceiling only a cross-country
      // pan reaches. When the quota is hit, this cache is the first to go.
      urlPattern: basemapRules.tiles,
      handler: 'CacheFirst',
      options: {
        cacheName: 'basemap-tiles',
        cacheableResponse: { statuses: [200] },
        expiration: {
          maxEntries: 1000,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          purgeOnQuotaError: true,
        },
      },
    },
    // Everything else — non-GET, Supabase, OSRM — never meets a cache.
  ];
}
