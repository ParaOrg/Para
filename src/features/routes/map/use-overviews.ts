import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import type { Snap } from '@/shared/ui/sheet-gesture';
import { bboxOf, type LngLat } from '@/shared/utils/geo';

import { APP_MOVE } from './map-view';
import { roomBeside } from './sheet-room';

/*
 * The camera taking in routes whole — the Overview button (useOverview), an end
 * picked — zooming in or out, clear of the card's sheet. Choosing a route moves
 * nothing: opening a trip, SWITCH, the filter, opening the route list and the
 * sheet changing height leave the camera the commuter's until they ask (the
 * owner, 2026-11-23). Choosing a place, or yourself, still takes the camera there.
 */

type MoveData = Readonly<Record<string, unknown>>;

/**
 * The camera takes in these lines whole, zooming in or out, clear of the
 * sheet on show. `data` rides on the move's events: APP_MOVE, or what tells
 * the Overview button's fit (useOverview).
 */
export function overview(
  map: MapLibreMap,
  lines: readonly (readonly LngLat[])[],
  dock: HTMLElement | null,
  snap: Snap,
  data: MoveData = APP_MOVE,
): void {
  const points = lines.filter((l) => l.length >= 2).flat();
  if (points.length < 2) return;
  const [w, s, e, n] = bboxOf(points);
  const padding = roomBeside(map.getContainer(), dock, snap);
  map.fitBounds(
    [
      [w, s],
      [e, n],
    ],
    { padding, maxZoom: 16, duration: 700, linear: true },
    data,
  );
}

/**
 * An end picked after a start: the camera takes in the ride from the start to
 * the end, clear of the sheet, which stays where it is (the owner's rule).
 * `picks` counts those ends;
 * the ride is read in the render the pick makes, and with none there (an end
 * the line can't take the ride to) the camera stays, the pick's own glide
 * taking it there (useRideTo).
 */
export function useRideOverview(
  map: MapLibreMap | null,
  ride: readonly (readonly LngLat[])[] | null,
  picks: number,
  dock: () => HTMLElement | null,
  snap: Snap,
): void {
  const rideRef = useRef(ride);
  // Kept current as each render commits, ahead of the effect below.
  useLayoutEffect(() => {
    rideRef.current = ride;
  });
  useEffect(() => {
    const lines = rideRef.current;
    if (!map || picks === 0 || !lines) return;
    overview(map, lines, dock(), snap);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only as an end is picked (see above): the count says when
  }, [map, picks]);
}

interface Camera {
  center: LngLat;
  zoom: number;
  bearing: number;
  pitch: number;
}

/**
 * A hotspot's RouteCard picked and let go: the camera goes back to where the
 * commuter had it before the pick's overview (the owner's call). `keep` as a
 * card is picked with none picked yet — so moving between cards keeps the
 * camera from before them all — and `back` as it is let go.
 */
export function useCameraBefore(map: MapLibreMap | null) {
  const kept = useRef<Camera | null>(null);
  // One object for the map's life, so an effect may name it.
  return useMemo(
    () => ({
      /** The camera now kept — or, given, one kept by another (`held`). */
      keep: (at: Camera | null = null) => {
        if (!map) return;
        const c = map.getCenter();
        kept.current = at ?? {
          center: [c.lng, c.lat],
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        };
      },
      /** What is kept, if anything. */
      held: () => kept.current,
      back: () => {
        const was = kept.current;
        kept.current = null;
        if (map && was) map.easeTo({ ...was, duration: 700 }, APP_MOVE);
      },
      /** Let it go, the camera staying where it is. */
      forget: () => {
        kept.current = null;
      },
    }),
    [map],
  );
}
