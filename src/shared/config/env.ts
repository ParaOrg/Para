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

/**
 * Whether the public map shows place search: only in a build made with `VITE_PLACE_SEARCH=1`. A
 * plain comparison, as `isMapExposed`'s, so a build without it drops the search's code.
 */
export const isPlaceSearchShown: boolean = import.meta.env.VITE_PLACE_SEARCH === '1';

/**
 * Whether the public map lets a commuter pick a ride on a trip: a stop's row or its name on the
 * map as the ride's end, Set as start. Only in a build made with `VITE_RIDE_PICKS=1`; without it
 * the stops are a plain list and the tiles show the whole ride. The studio's trip card always can.
 */
export const isRidePickingOn: boolean = import.meta.env.VITE_RIDE_PICKS === '1';

// TODO: nothing reads this yet; the notice that tells an editor so waits for the owner's design.
/**
 * Whether a page at `hostname` is a preview that works on the live data: staging's and every
 * branch's `workers.dev` address. Never the contributor app, whose page is served from
 * `https://localhost` on the phone.
 */
export function isLiveDataPreview(
  hostname: string = window.location.hostname,
  mode: string = import.meta.env.MODE,
): boolean {
  return mode !== 'apk' && hostname.endsWith('.workers.dev');
}
