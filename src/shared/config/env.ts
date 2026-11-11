import { parseBasemapHost } from './basemap-host';

/**
 * The origin the basemaps' styles, tiles, sprites and glyphs come from
 * (`VITE_BASEMAP_HOST`, committed in `.env.production`). OpenFreeMap when unset.
 */
export const basemapHost: string = parseBasemapHost(import.meta.env.VITE_BASEMAP_HOST);

/**
 * Whether the map is handed out on `window` (features/routes/map/expose-map.ts): in a dev build,
 * and in a production build made with `VITE_EXPOSE_MAP=1`, which only the cheap-phone timer makes
 * for itself. `npm run build` never sets it. A plain comparison, not a parsed value, on purpose:
 * the build works it out to `false` and drops the hand-out with it, where a value parsed as the
 * page runs would leave the code in (check-build.mjs fails a build that carries it).
 */
export const isMapExposed: boolean = import.meta.env.DEV || import.meta.env.VITE_EXPOSE_MAP === '1';
