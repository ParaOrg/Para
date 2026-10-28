import type { Plugin } from 'vite';

/**
 * MapLibre's worker, built with the page instead of on its own. MapLibre 6
 * ships three files: the page's maplibre-gl.mjs and the worker's
 * maplibre-gl-worker.mjs both import maplibre-gl-shared.mjs, most of the
 * code. `?worker&url` alone builds the worker as a bundle of its own, the
 * shared file copied into it: over a hundred kB gzipped that the map's 'load'
 * waits for, of code the page has just downloaded. Here the worker is a chunk
 * of the page's own build, so it imports the page's maplibre-gl-shared chunk
 * (its own chunk group in vite.config.ts), which the browser already holds,
 * and what is left of it is a few kB.
 *
 * Build only: under `npm run dev` map-view.tsx's `?worker&url` reaches Vite's
 * own worker plugin. In a build this answers that import first, with the URL
 * of the chunk it emits. check-build.mjs proves the worker imports nothing
 * but MapLibre's shared code and Vite's preload helper: our shared chunk,
 * with React, in the worker would stop the map.
 */
export const MAPLIBRE_WORKER_URL = 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
export function maplibreWorkerWithThePage(): Plugin {
  const resolved = '\0para:maplibre-worker-url';
  return {
    name: 'para:maplibre-worker',
    apply: 'build',
    // Ahead of Vite's worker plugin, which would build it on its own.
    enforce: 'pre',
    resolveId(source) {
      return source === MAPLIBRE_WORKER_URL ? resolved : null;
    },
    async load(id) {
      if (id !== resolved) return null;
      const worker = await this.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs');
      if (!worker) throw new Error('maplibre-gl/dist/maplibre-gl-worker.mjs is missing');
      const ref = this.emitFile({ type: 'chunk', id: worker.id, name: 'maplibre-gl-worker' });
      // `new URL('maplibre-gl-worker-<hash>.js', import.meta.url).href` in
      // the chunk that reads it, beside it in assets/.
      return `export default import.meta.ROLLUP_FILE_URL_${ref}`;
    },
  };
}
