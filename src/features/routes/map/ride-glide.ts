import type { EaseToOptions, MapLibreMap } from 'maplibre-gl';

import type { LngLat } from '@/shared/utils/geo';

/** How far inside the map's clear part a picked place must sit for the camera to stay put. */
const IN_VIEW_PX = 48;

/**
 * Where the camera goes for a picked hintuan or end at `at`, `offset` from
 * the map's centre clear of the card (onGlide): nowhere while the place is in
 * view clear of the card, and there at the commuter's own zoom when it is not
 * — a row tapped on the card can name a hintuan off the screen. A pick never
 * zooms (the owner's call). Null: stay.
 */
export function glideFor(
  map: MapLibreMap,
  at: LngLat,
  offset: [number, number],
): EaseToOptions | null {
  if (isInClearView(map, at, offset)) return null;
  return { center: at, zoom: map.getZoom(), offset };
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
