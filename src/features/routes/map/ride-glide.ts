import type { EaseToOptions, MapLibreMap } from 'maplibre-gl';

import { zoomForScale, type LngLat } from '@/shared/utils/geo';

/** How close a picked hintuan is brought in: the scale bar reading this. */
const PICKED_SCALE_M = 500;

/**
 * Closer in than this — the scale bar reading under 300 m — a pick keeps
 * the visitor's zoom (the owner's ask, 2026-10-13: "if it's below 300m and
 * tapped the hintuan, don't zoom out, remain where the user camera was").
 */
const KEEP_CAMERA_UNDER_M = 300;

/** How far inside the map's clear part a picked place must sit for the camera to stay put. */
const IN_VIEW_PX = 48;

/**
 * Where the camera goes for a picked hintuan or end at `at`, `offset` from
 * the map's centre clear of the card (onGlide): in to the scale bar's
 * 500 m; or, already closer than 300 m, nowhere while the place is in view
 * clear of the card, and there at the visitor's own zoom when it is not —
 * a row tapped on the card can name a hintuan off the screen. Null: stay.
 */
export function glideFor(
  map: MapLibreMap,
  at: LngLat,
  offset: [number, number],
): EaseToOptions | null {
  const zoom = map.getZoom();
  const isClose = zoom > zoomForScale(KEEP_CAMERA_UNDER_M, map.getCenter().lat);
  if (!isClose) return { center: at, zoom: zoomForScale(PICKED_SCALE_M, at[1]), offset };
  return isInClearView(map, at, offset) ? null : { center: at, zoom, offset };
}

/**
 * Whether `at` is on the screen, IN_VIEW_PX inside the part of the map a
 * card leaves clear. The offset is half what the card covers (clearOfDock):
 * a corner card's width on the left, a docked sheet's height at the bottom.
 */
function isInClearView(map: MapLibreMap, at: LngLat, [dx, dy]: [number, number]): boolean {
  const { clientWidth: width, clientHeight: height } = map.getContainer();
  const { x, y } = map.project(at);
  const left = Math.max(0, 2 * dx) + IN_VIEW_PX;
  const right = width + Math.min(0, 2 * dx) - IN_VIEW_PX;
  const top = Math.max(0, 2 * dy) + IN_VIEW_PX;
  const bottom = height + Math.min(0, 2 * dy) - IN_VIEW_PX;
  return x >= left && x <= right && y >= top && y <= bottom;
}
