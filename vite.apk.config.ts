import { renameSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * The contributor page's build for the Android app: that page only, no worker, no map file, none
 * of the public map's data. Capacitor serves dist-apk/ from its root, so the page moves from
 * dist-apk/contribute/index.html to dist-apk/index.html. The mode is `apk`, which reads .env.apk
 * (public values only) and never .env.production, and turns on the Capacitor import in
 * features/contribute/native-app.ts.
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

export default defineConfig({
  mode: 'apk',
  plugins: [react(), tailwindcss(), pageAtTheRoot()],
  publicDir: false,
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: 'dist-apk',
    emptyOutDir: true,
    rolldownOptions: { input: { contribute: 'contribute/index.html' } },
  },
});
