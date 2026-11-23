import { renameSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

import { basemapStyleUrl, parseBasemapHost } from './src/shared/config/basemap-host';

/**
 * The contributor page's build for the Android app: that page only, no worker, no map file, none
 * of the public map's data. Capacitor serves dist-apk/ from its root, so the page moves from
 * dist-apk/contribute/index.html to dist-apk/index.html. The mode is `apk`, which reads .env.apk
 * (public values only) and never .env.production, and turns on the Capacitor import in
 * features/contribute/native-bridge/native-app.ts.
 */
function pageAtTheRoot(): Plugin {
  return {
    name: 'para:apk-page-at-the-root',
    apply: 'build',
    writeBundle(options) {
      const out = options.dir;
      if (!out) throw new Error('the app build has no output folder');
      renameSync(`${out}/contribute/index.html`, `${out}/index.html`);
      rmSync(`${out}/contribute`, { recursive: true });
    },
    // publicDir is off, so the page's favicon link would point at a file the app does not have.
    transformIndexHtml(html) {
      return html.replace(/\s*<link rel="icon"[^>]*>/, '');
    },
  };
}

/**
 * The basemaps' ids, as basemap.ts names them (BASEMAPS): the style each is built from is the
 * host's `/styles/<id>`.
 */
const BASEMAP_IDS = ['positron', 'liberty', 'fiord'] as const;

/**
 * Each basemap's style as the build fetches it, in the app's own files at
 * `basemap-styles/<id>.json`: what a map made with no signal and no copy of its own draws with
 * (features/contribute/map/basemap-copies.ts). A style that cannot be fetched fails the build, so
 * an app is never shipped without them.
 */
function basemapStylesInTheApp(host: string): Plugin {
  const styles = new Map<string, string>();
  return {
    name: 'para:apk-basemap-styles',
    apply: 'build',
    async buildStart() {
      for (const id of BASEMAP_IDS) {
        const url = basemapStyleUrl(host, id);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`The basemap style ${url} answered ${response.status}.`);
        const style: unknown = await response.json();
        const isStyle =
          typeof style === 'object' && style !== null && 'version' in style && 'layers' in style;
        if (!isStyle) throw new Error(`The basemap style ${url} is not a style.`);
        styles.set(id, JSON.stringify(style));
      }
    },
    generateBundle() {
      for (const [id, source] of styles) {
        this.emitFile({ type: 'asset', fileName: `basemap-styles/${id}.json`, source });
      }
    },
  };
}

const basemapHost = parseBasemapHost(loadEnv('apk', process.cwd(), 'VITE_').VITE_BASEMAP_HOST);

export default defineConfig({
  mode: 'apk',
  plugins: [react(), tailwindcss(), pageAtTheRoot(), basemapStylesInTheApp(basemapHost)],
  publicDir: false,
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: 'dist-apk',
    emptyOutDir: true,
    rolldownOptions: { input: { contribute: 'contribute/index.html' } },
  },
});
