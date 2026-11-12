import type { MapLibreMap } from 'maplibre-gl';

import { isMapExposed } from '@/shared/config/env';

/*
 * The map handed out on `window`, for the headless suites and the cheap-phone timer, and for no
 * one else. Dev builds do it, so the suites (tests/e2e/) can read real screen positions from the
 * drawn geometry instead of guessing. So does the production build
 * scripts/research/phone-speed.mjs makes for itself with VITE_EXPOSE_MAP=1, to time a cheap phone
 * on the code commuters get. `npm run build` never sets it, and check-build.mjs fails a build that
 * carries the map out.
 */

/**
 * The map from its making: the cheap-phone timer stamps its 'load' and its first frame with the
 * routes drawn from here, before any of its events can fire. So do the suites, for the camera it
 * was made at and the first lines it draws, before its 'load' on the public map.
 */
export function exposeMapEarly(map: MapLibreMap): void {
  if (isMapExposed) (window as unknown as { __mapEarly?: MapLibreMap }).__mapEarly = map;
}

/**
 * The map at its 'load', and with it the GL programs compiled so far by MapLibre's own key:
 * painter.cache is MapLibre's inside, so it is read here and nowhere else, for the timer and the
 * suites to see what a tap compiles.
 */
export function exposeMap(shown: MapLibreMap): void {
  if (isMapExposed) {
    const w = window as unknown as { __map?: MapLibreMap; __programs?: () => string[] };
    w.__map = shown;
    w.__programs = () =>
      Object.keys((shown as unknown as { painter: { cache: object } }).painter.cache);
  }
}
