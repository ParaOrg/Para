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
