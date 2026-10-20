import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { shownAt, type Snap } from '@/shared/ui/sheet-gesture';
import { clearOfSheet, roomBeside } from '@/shared/ui/sheet-room';
import { bboxOf, zoomForScale, type LngLat } from '@/shared/utils/geo';

import { APP_MOVE } from './map-view';
import type { Framed } from '../cards/card-stack';
import { directionLine, type Direction } from '../model/routes';

/*
 * The camera taking in routes whole — SWITCH pressed, an end picked, the sheet
 * settled at another height — zooming in or out, clear of the card's sheet.
 * Opening a trip, picking a RouteCard and opening the route list move nothing
 * (the owner's call, 2026-10-21).
 */

/**
 * The farthest out the sheet going up takes the camera: the scale bar at 5 km
 * (the owner's call; 2.5 km is too close from Middle up). Further out than
 * that only by the commuter's own hand.
 */
const RAISED_FARTHEST_M = 5000;

/**
 * The camera takes in these lines whole, zooming in or out, clear of the
 * sheet on show. `farthestM`: no further out than the scale bar reading
 * that, the lines' middle kept where the fit would put it.
 */
function overview(
  map: MapLibreMap,
  lines: readonly (readonly LngLat[])[],
  dock: HTMLElement | null,
  snap: Snap,
  farthestM?: number,
) {
  const points = lines.filter((l) => l.length >= 2).flat();
  if (points.length < 2) return;
  const [w, s, e, n] = bboxOf(points);
  const padding = roomBeside(map.getContainer(), dock, snap);
  const floor = farthestM === undefined ? -Infinity : zoomForScale(farthestM, (s + n) / 2);
  const fit = map.cameraForBounds(
    [
      [w, s],
      [e, n],
    ],
    { padding, maxZoom: 16 },
  );
  if (fit?.zoom === undefined || fit.zoom >= floor) {
    map.fitBounds(
      [
        [w, s],
        [e, n],
      ],
      { padding, maxZoom: 16, duration: 700, linear: true },
      APP_MOVE,
    );
    return;
  }
  // In closer than the fit: the lines' middle at the middle of the room the sheet leaves.
  const offset: [number, number] = [
    (padding.left - padding.right) / 2,
    (padding.top - padding.bottom) / 2,
  ];
  map.easeTo({ center: [(w + e) / 2, (s + n) / 2], zoom: floor, offset, duration: 700 }, APP_MOVE);
}

/**
 * SWITCH pressed — on the route list, a hotspot's card or a trip: the camera
 * takes in what is lit now, the routes the other way round, as a pick does
 * (the owner's call). `switches` counts the presses. What is lit is read a
 * frame later: a hotspot's card says what it shows from its own effect, a
 * render after the press.
 */
export function useSwitchOverview(
  map: MapLibreMap | null,
  lit: readonly Direction[],
  switches: number,
  dock: () => HTMLElement | null,
  snap: Snap,
): void {
  const litRef = useRef(lit);
  // Kept current as each render commits, for the frame below to read.
  useLayoutEffect(() => {
    litRef.current = lit;
  });
  useEffect(() => {
    if (!map || switches === 0) return;
    const frame = requestAnimationFrame(() =>
      overview(map, litRef.current.map(directionLine), dock(), snap),
    );
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only as SWITCH is pressed (see above): the count says when
  }, [map, switches]);
}

/**
 * The sheet settled at another height — Low, Middle, Max, or where a drag
 * left it: the camera takes in again what the card on show frames, in what
 * map the sheet leaves now (the owner's call). Routes are fitted whole, in
 * close above Low, out above Middle — and at Max, which on a phone leaves
 * only a strip of map, as at Middle (roomBeside); a place is brought into
 * view at its zoom. Whatever the commuter did to the map since, the overview
 * comes back. Going up, it zooms out no further than RAISED_FARTHEST_M on the
 * scale bar (the owner's call); coming down, the whole route. `frame` is read
 * as the sheet settles; null, with no card on show, moves nothing.
 */
export function useHeightOverview(
  map: MapLibreMap | null,
  snap: Snap,
  frame: () => Framed,
  dock: () => HTMLElement | null,
): void {
  const last = useRef(snap);
  const now = useRef({ frame, dock });
  // Kept current as each render commits, ahead of the effect below.
  useLayoutEffect(() => {
    now.current = { frame, dock };
  });
  useEffect(() => {
    const was = last.current;
    if (was === snap) return;
    last.current = snap;
    const framed = now.current.frame();
    if (!map || !framed) return;
    const sheet = now.current.dock();
    const h = sheet?.offsetHeight ?? 0;
    const up = shownAt(snap, h) > shownAt(was, h);
    if ('lines' in framed)
      overview(map, framed.lines, sheet, snap, up ? RAISED_FARTHEST_M : undefined);
    else
      map.easeTo(
        { center: framed.at, offset: clearOfSheet(map.getContainer(), sheet, snap), duration: 700 },
        APP_MOVE,
      );
  }, [map, snap]);
}

/**
 * An end picked after a start, the sheet already at Middle (the owner's
 * call): the camera takes in the ride from the start to the end, clear of the
 * sheet. Below or above Middle the sheet moves there first and
 * useHeightOverview frames the ride as it settles. `picks` counts those ends;
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
