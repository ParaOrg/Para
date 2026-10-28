import type { Plugin } from 'vite';

import { withBasemapPreconnect } from '../basemap-offline.ts';

/** Points index.html's preconnect at the configured basemap host (see withBasemapPreconnect). */
export function basemapPreconnect(host: string): Plugin {
  return {
    name: 'para:basemap-preconnect',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => withBasemapPreconnect(html, host),
    },
  };
}
