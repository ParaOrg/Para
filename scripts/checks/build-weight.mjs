// The build's weight budgets and how they are measured, shared by check-build.mjs
// (which fails the build over a budget) and health.mjs (which reports the margin).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

export const FONTS_MAX_KB = 135;

/** MapLibre's worker, its own chunk, gzipped. */
export const WORKER_MAX_GZ_KB = 20;

// What both pages share, gzipped, in kB on 2026-10-05: MapLibre's page
// file 137.4 and the code it shares with its worker 134.8 (step 14; one
// chunk of 249.7 at step 12, the worker's share being in the worker then),
// React 57.6 and our shared code 41.0, 370.8 together (the one chunk it was
// weighed 348.4). Each ceiling leaves some headroom and none for another
// group's package: React in `shared` is +58, a half of MapLibre +135.
// `packages` is what the chunk may hold from node_modules, `only` the files
// it may hold; `vendor` chunks may import no chunk of ours. The locator counts
// here as both pages draw it: the public page's own chunk is that much lighter,
// its download no heavier. Raised from 410 to 412 on 2026-10-31 for the Map
// Style card's Location Labels switch (the design system's Switch, the row and
// the label rule): 409.8 on staging before it, 411.4 with it. Lazy-loading the
// card would give the room back.
export const SHARED_MAX_GZ_KB = 412;
export const MAPLIBRE_FILE = (name) => new RegExp(`/node_modules/maplibre-gl/dist/${name}\\.mjs$`);
export const GROUPS = [
  {
    name: 'maplibre',
    maxGzKb: 160,
    vendor: true,
    packages: ['maplibre-gl'],
    only: MAPLIBRE_FILE('maplibre-gl'),
    holds: 'maplibre-gl.mjs alone, and imports none of our code',
  },
  {
    name: 'maplibre-gl-shared',
    maxGzKb: 160,
    vendor: true,
    packages: ['maplibre-gl'],
    only: MAPLIBRE_FILE('maplibre-gl-shared'),
    holds: 'maplibre-gl-shared.mjs alone, and imports none of our code',
  },
  {
    name: 'react',
    maxGzKb: 70,
    vendor: true,
    packages: ['react', 'react-dom', 'scheduler'],
    holds: 'react, react-dom and scheduler, none of our code, and imports none of it',
  },
  // Zod validates the published index as the public map reads it (ticket 08
  // of the restructure follow-ups, 2026-10-07): zod/mini, the tree-shakeable
  // API, since the classic one weighed 24.3 kB gzipped over these schemas.
  // Its own chunk, so its weight is read here on every build. 11, not 10:
  // zod 4.6.7, the fix for a high-severity advisory in 4.6.5, weighs 10.3 kB.
  {
    name: 'zod',
    maxGzKb: 11,
    vendor: true,
    packages: ['zod'],
    holds: 'zod alone, and imports none of our code',
  },
  // From maplibre-gl, its stylesheet and the worker's address (map-view.tsx);
  // its JavaScript here would be over the ceiling.
  {
    name: 'shared',
    maxGzKb: 80,
    vendor: false,
    packages: ['maplibre-gl'],
    holds: 'our shared code and no package but maplibre-gl',
  },
];

/** The bytes of every font file in dist/assets. */
export function fontBytes(dist) {
  return readdirSync(join(dist, 'assets'))
    .filter((f) => f.endsWith('.woff2'))
    .reduce((n, f) => n + statSync(join(dist, 'assets', f)).size, 0);
}

/** A group's chunk is the one Vite's manifest names after it. */
export function chunksNamed(manifest, name) {
  return Object.values(manifest).filter((c) => c.name === name && c.file.endsWith('.js'));
}

/** The gzipped size of the given files of dist/, together. */
export function gzipBytes(dist, files) {
  return files.reduce((n, f) => n + gzipSync(readFileSync(join(dist, f))).length, 0);
}

/** Reads dist/'s manifest, or null when the app has not been built. */
export function readManifest(dist) {
  const path = join(dist, '.vite', 'manifest.json');
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}
