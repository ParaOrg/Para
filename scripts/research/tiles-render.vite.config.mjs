// Bundles the spike's render page. Separate from the app's vite.config.ts, which the spike leaves alone.
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  publicDir: false,
  resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
  build: {
    outDir: fileURLToPath(new URL('../../node_modules/.tiles-spike-page', import.meta.url)),
    emptyOutDir: true,
    rollupOptions: { input: fileURLToPath(new URL('./tiles-render.html', import.meta.url)) },
  },
});
