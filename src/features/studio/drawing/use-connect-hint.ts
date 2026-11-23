import { Marker, type MapLibreMap, type MapMouseEvent, type PointLike } from 'maplibre-gl';
import { useEffect } from 'react';

import type { LngLat } from '@/shared/utils/geo';

/*
 * Closing a line by its first point. When the cursor comes within CONNECT_PX
 * of where the line may close (its own first point, or a return trip's
 * outbound start), a small connect badge shows beside that point, as a pen
 * tool marks the click that closes a path; a click there ends the line on
 * that point exactly (draw-clicks.ts). A mouse's cue: a finger, and a
 * keyboard, close the loop with the toolbar's button.
 */

/** How near, in screen pixels, the cursor or a click must be to the closing point. */
export const CONNECT_PX = 14;

/**
 * Where a click on each map closes the line being drawn, while it may close.
 * Kept by the map rather than on the drawing: useLoopClosing knows it, the
 * drawing's click reads it (draw-clicks.ts), and neither hands the other its
 * state.
 */
const closeTargets = new WeakMap<MapLibreMap, LngLat>();

/** Where a click on `map` closes the line, or null. */
export function closeTargetOf(map: MapLibreMap): LngLat | null {
  return closeTargets.get(map) ?? null;
}

/** Whether a screen point is within CONNECT_PX of `closeAt`. */
export function isNearClose(map: MapLibreMap, point: PointLike, closeAt: LngLat): boolean {
  const at = map.project(closeAt);
  const [x, y] = Array.isArray(point) ? point : [point.x, point.y];
  return Math.hypot(at.x - x, at.y - y) <= CONNECT_PX;
}

const SVG = 'http://www.w3.org/2000/svg';

/** The badge: the drawing's point look (a white disc, a parabrand-800 rim), 24 across, around a 16 px link. */
export function badge(): HTMLDivElement {
  const el = document.createElement('div');
  el.dataset.testid = 'connect-hint';
  el.setAttribute('aria-hidden', 'true');
  el.className =
    'pointer-events-none grid size-6 place-items-center rounded-full bg-surface text-parabrand-800 shadow-sm ring-2 ring-parabrand-800';
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('stroke-linecap', 'round');
  // Two links of a chain, joined: the line's end meets its start.
  for (const d of ['M8.5 6H6.5a4 4 0 0 0 0 8h2', 'M11.5 6h2a4 4 0 0 1 0 8h-2', 'M7 10h6']) {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  el.appendChild(svg);
  return el;
}

/**
 * The badge beside `closeAt` while the cursor is near it, and `closeAt` as
 * where a click closes the line; neither while it is null.
 */
export function useConnectHint(map: MapLibreMap | null, closeAt: LngLat | null): void {
  const lng = closeAt?.[0];
  const lat = closeAt?.[1];

  useEffect(() => {
    if (!map || lng === undefined || lat === undefined) return;
    const at: LngLat = [lng, lat];
    closeTargets.set(map, at);
    // Below and to the right of the point, where a pen tool puts its own mark.
    const marker = new Marker({ element: badge(), anchor: 'top-left', offset: [6, 6] }).setLngLat(
      at,
    );
    let isShown = false;
    const show = (isNear: boolean) => {
      if (isNear === isShown) return;
      isShown = isNear;
      if (isNear) marker.addTo(map);
      else marker.remove();
    };
    const handleMove = (e: MapMouseEvent) => show(isNearClose(map, e.point, at));
    const handleOut = () => show(false);
    map.on('mousemove', handleMove);
    map.on('mouseout', handleOut);
    return () => {
      map.off('mousemove', handleMove);
      map.off('mouseout', handleOut);
      marker.remove();
      if (closeTargets.get(map) === at) closeTargets.delete(map);
    };
  }, [map, lng, lat]);
}
