import { parseBasemapHost } from './basemap-host';

/**
 * The origin the basemaps' styles, tiles, sprites and glyphs come from
 * (`VITE_BASEMAP_HOST`, committed in `.env.production`). OpenFreeMap when unset.
 */
export const basemapHost: string = parseBasemapHost(import.meta.env.VITE_BASEMAP_HOST);
