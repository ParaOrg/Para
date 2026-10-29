// 4. The installable app's worker (dist/sw.js): its precache holds the public
//    page's chunks, the MapLibre worker and the icons, and no studio chunk,
//    nothing from .vite/ or data/, and not _headers; the studio is on the
//    worker's navigation denylist; a new version waits to be asked.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { OPENFREEMAP_HOST } from '../../../src/shared/config/basemap-host.ts';

export function provePublicWorker(build, check) {
  const { dist, manifest, html, commuterFiles, studioFiles, contributeFiles, basemapHost } = build;
  const { basemapRules } = build;
  const { MAP_FILE_URL } = build.mapFile;

  const swPath = join(dist, 'sw.js');
  check('sw.js exists', existsSync(swPath));
  if (!existsSync(swPath)) return;
  const sw = readFileSync(swPath, 'utf8');
  const precached = [...sw.matchAll(/"?url"?:\s*"([^"]+)"/g)].map((m) => m[1]);
  const expected = ['index.html', 'manifest.webmanifest', ...commuterFiles];
  const cssOf = (files) =>
    files.flatMap((f) => Object.values(manifest).find((c) => c.file === f)?.css ?? []);
  expected.push(...cssOf(commuterFiles));
  const missingPrecache = expected.filter((f) => !precached.includes(f));
  check(
    `precache holds the public page, its ${commuterFiles.length} chunk(s) and CSS (${precached.length} entries)`,
    missingPrecache.length === 0,
    missingPrecache.length ? 'missing: ' + missingPrecache.join(', ') : '',
  );
  check(
    'precache holds the MapLibre worker',
    precached.some((u) => /^assets\/maplibre-gl-worker-.*\.js$/.test(u)),
  );
  const fonts = readdirSync(join(dist, 'assets'))
    .filter((f) => f.endsWith('.woff2'))
    .map((f) => `assets/${f}`);
  check(
    `precache holds the ${fonts.length} font files`,
    fonts.length > 0 && fonts.every((f) => precached.includes(f)),
    fonts.filter((f) => !precached.includes(f)).join(', '),
  );
  // The vehicles' sprite, fetched by the trip's header rather than inlined in
  // the JS: offline, the header still draws its vehicle.
  const sprites = readdirSync(join(dist, 'assets'))
    .filter((f) => /^vehicle-icons-.*\.svg$/.test(f))
    .map((f) => `assets/${f}`);
  check(
    "precache holds the vehicles' sprite",
    sprites.length === 1 && precached.includes(sprites[0]),
    sprites.join(', ') || 'no vehicle-icons-*.svg in assets/',
  );
  check(
    'precache holds the three icons',
    ['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png'].every((u) =>
      precached.includes(u),
    ),
  );
  const studioOnly = studioFiles.filter((f) => !commuterFiles.includes(f));
  const contributeOnly = contributeFiles.filter((f) => !commuterFiles.includes(f));
  const leakedPrecache = precached.filter(
    (u) =>
      studioOnly.includes(u) ||
      contributeOnly.includes(u) ||
      /^(studio\/|contribute\/|\.vite\/|data\/|branding\/|_headers)/.test(u),
  );
  check(
    `precache holds no studio or contribute chunk (${studioOnly.length + contributeOnly.length} to keep out), nothing from studio/, contribute/, .vite/, data/, branding/, no _headers`,
    studioOnly.length > 0 && contributeOnly.length > 0 && leakedPrecache.length === 0,
    leakedPrecache.join(', '),
  );
  check(
    'sw.js answers only / from the stored page, and never /studio or /contribute',
    sw.includes('/^\\/(\\?.*)?$/') &&
      sw.includes('/^\\/studio(\\/|$)/') &&
      sw.includes('/^\\/contribute(\\/|$)/'),
  );
  check(
    `sw.js caches ${MAP_FILE_URL} NetworkFirst (stamping what it serves from the store), the lines under /data/lines/, the signboards under /data/signboards/, and the basemap host's (${basemapHost}) styles StaleWhileRevalidate and tiles CacheFirst`,
    !!MAP_FILE_URL &&
      sw.includes(MAP_FILE_URL) &&
      sw.includes('/data/lines/') &&
      sw.includes('map-lines') &&
      sw.includes('/data/signboards/') &&
      sw.includes('x-para-served-from') &&
      sw.includes(basemapRules.meta.source) &&
      sw.includes(basemapRules.tiles.source) &&
      sw.includes('basemap-meta') &&
      sw.includes('map-file') &&
      sw.includes('basemap-tiles'),
  );
  check(
    `index.html preconnects to the basemap host (${basemapHost}), and a host other than OpenFreeMap leaves OpenFreeMap out of the worker`,
    html('index.html').includes(`<link rel="preconnect" href="${basemapHost}" crossorigin />`) &&
      (basemapHost === OPENFREEMAP_HOST || !/openfreemap/i.test(sw)),
  );
  // With `skipWaiting: false` Workbox calls skipWaiting() once, inside the
  // handler for the page's SKIP_WAITING message — never on its own.
  const msgAt = sw.indexOf('SKIP_WAITING');
  const skipAt = sw.indexOf('skipWaiting()');
  // A missing file is the map's page, 200 (wrangler.jsonc): each store keeps
  // only its own type, or that page would be kept as the map.
  check(
    'sw.js keeps only JSON as the map and its lines, and only SVG as a signboard',
    (sw.match(/startsWith\("application\/json"\)/g) ?? []).length >= 2 &&
      sw.includes('startsWith("image/svg+xml")'),
  );
  check(
    'sw.js waits to be told to update (one skipWaiting(), inside the SKIP_WAITING handler)',
    msgAt >= 0 && skipAt > msgAt && sw.indexOf('skipWaiting()', skipAt + 1) === -1,
  );
}
