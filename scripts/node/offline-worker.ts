import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import type { BasemapCacheRules } from './basemap-offline.ts';
import { runtimeCaches } from './offline-worker-caches.ts';

/** Brand colours, measured from the logo: the wordmark's maroon and a warm off-white behind the pin. */
const THEME_COLOUR = '#8a595a';
const BACKGROUND_COLOUR = '#f5f1ee';

/**
 * The public map's installable app: its manifest and its offline worker
 * (dist/sw.js), whose precache is the public page's shell and whose runtime
 * caches are runtimeCaches'.
 */
export function offlineWorker(basemapRules: BasemapCacheRules): Plugin[] {
  /**
   * Where this build writes, as Vite resolved it: dist/ for `npm run build`,
   * its own folder for scripts/research/phone-speed.mjs. The precache below
   * is cut down by that build's own manifest: read from dist/ whatever the
   * folder, the timer's build would be cut down by dist/'s chunk names, and
   * its own page's chunks left out of its precache.
   */
  let outDir = 'dist';
  const readOutDir: Plugin = {
    name: 'para:out-dir',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
  };

  return [
    readOutDir,
    ...VitePWA({
      // The page registers the worker itself (src/features/published-map/pwa.ts), so the
      // plugin writes no registration script — and none into /studio/.
      injectRegister: false,
      // A new version waits until the commuter taps "Reload": a silent reload
      // mid-ride would throw away the selected route.
      registerType: 'prompt',
      // Off under `npm run dev`, so the headless checks never meet a worker.
      // Test with `npm run build && npm run preview` (tests/e2e/pwa-test.mjs).
      devOptions: { enabled: false },
      manifest: {
        name: 'Para',
        short_name: 'Para',
        description: 'Jeepney routes in Metro Manila, drawn from the ground.',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        lang: 'en',
        theme_color: THEME_COLOUR,
        background_color: BACKGROUND_COLOUR,
        categories: ['navigation', 'travel'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // The public map's shell and nothing else. The glob keeps out studio/,
        // .vite/, data/ and _headers by construction; the transform below
        // then drops every chunk the public page does not load, so a studio-only
        // chunk (the editor, the Supabase client) is never stored on a phone.
        // The fonts too, subset to Latin and small: offline, the text keeps its
        // face. And the install prompt's picture, so the card is whole offline
        // too; the transform keeps only the page's own. And the vehicles'
        // sprite, so a trip's header draws its vehicle offline.
        globPatterns: [
          'index.html',
          'manifest.webmanifest',
          'assets/*.{js,css,woff2,webp,svg}',
          'icons/icon-*.png',
        ],
        manifestTransforms: [
          (entries) => {
            // Written by Vite with the bundle; the worker is generated after.
            const manifestPath = join(outDir, '.vite', 'manifest.json');
            if (!existsSync(manifestPath)) {
              throw new Error(
                `${manifestPath} is missing: the precache cannot be limited to the public page`,
              );
            }
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<
              string,
              {
                file: string;
                css?: string[];
                assets?: string[];
                imports?: string[];
                dynamicImports?: string[];
              }
            >;
            const keep = new Set<string>();
            const visit = (key: string) => {
              const chunk = manifest[key];
              if (!chunk || keep.has(chunk.file)) return;
              keep.add(chunk.file);
              for (const css of chunk.css ?? []) keep.add(css);
              for (const asset of chunk.assets ?? []) keep.add(asset);
              for (const k of [...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])]) visit(k);
            };
            visit('index.html');
            // MapLibre's tile worker is a chunk of its own (maplibreWorkerWithThePage)
            // that no page imports, so the walk from index.html never
            // reaches it; without it the map draws nothing. What it imports, the
            // page imports too.
            const wanted = (url: string) =>
              !url.startsWith('assets/') ||
              keep.has(url) ||
              /^assets\/maplibre-gl-worker-/.test(url);
            return { manifest: entries.filter((e) => wanted(e.url)), warnings: [] };
          },
        ],
        // The map has exactly one address, `/` (with any query), and only that is
        // answered from the stored page. Any other navigation goes to the
        // server as it would without a worker — so `/studio` and `/contribute` (with
        // or without the slash) open their own pages, and `/data/index.v5.json`
        // typed into a tab shows the data, not the app. The studio sits inside the installed
        // app's scope regardless; the denylist is the belt to the allowlist.
        navigateFallback: 'index.html',
        navigateFallbackAllowlist: [/^\/(\?.*)?$/],
        navigateFallbackDenylist: [/^\/studio(\/|$)/, /^\/contribute(\/|$)/],
        cleanupOutdatedCaches: true,
        // Deletes the old app's `para-ph-*` caches on activate. It sits in public/,
        // so it is served beside the worker and never precached.
        importScripts: ['old-app-cleanup.js'],
        clientsClaim: true,
        skipWaiting: false,
        runtimeCaching: runtimeCaches(basemapRules),
      },
    }),
  ];
}
