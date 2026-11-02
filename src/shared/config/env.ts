import { parseBasemapHost } from './basemap-host';

/**
 * The origin the basemaps' styles, tiles, sprites and glyphs come from
 * (`VITE_BASEMAP_HOST`, committed in `.env.production`). OpenFreeMap when unset.
 */
export const basemapHost: string = parseBasemapHost(import.meta.env.VITE_BASEMAP_HOST);

/**
 * Whether this is the CI emulator ride's build (`VITE_EMULATOR_RIDE=1`, contributor-app.yml), whose
 * driver holds the ride's notification itself.
 */
export const isEmulatorRide: boolean = import.meta.env.VITE_EMULATOR_RIDE === '1';
