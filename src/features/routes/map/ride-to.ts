import type { EaseToOptions, MapLibreMap } from 'maplibre-gl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { zoomForScale, type LngLat } from '@/shared/utils/geo';

import { APP_MOVE } from './map-view';
import { hotspotLabel, type Hotspot } from '../model/hotspots';
import { stationCode } from '../model/rail-codes';
import { rideCut, travelLine } from '../model/ride';
import { isRailLine, type Direction } from '../model/routes';

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
function glideFor(map: MapLibreMap, at: LngLat, offset: [number, number]): EaseToOptions | null {
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

/**
 * A hintuan picked on the trip card — the owner's Timeline State=Selected,
 * 2026-09-29: its pill prices the ride from the start to there, and the map
 * glides there clear of the card. The route stays whole since 2026-09-30
 * (the owner: "now I don't want to cut the route"), a circle popping up where
 * `pinAt` says (HintuanPin.tsx); the studio went the same way that day ("most
 * of the interaction of public map should be in studio"), so the way not
 * ridden drawn at rest and its get-off circles went with it. Tapping the row
 * again, an end row, another route or the card away lets the pick go. An end
 * row glides there (`toEnd`), so a rider can look along the route from end
 * to end (the owner's ask, 2026-09-29), in as close as a hintuan is brought
 * (the owner's ask, 2026-10-03).
 */
export function useRideTo(
  map: MapLibreMap | null,
  selected: Direction | null,
  hotspots: readonly Hotspot[],
  opts: {
    /**
     * As a glide starts: where it puts the hintuan, or the end, from the
     * map's centre, in pixels — clear of a card over the map (clearOfSheet).
     */
    onGlide?: () => [number, number];
  } = {},
) {
  // Which direction the pick was made on: a pick belongs to its ride, so the
  // first render of another one — SWITCH, a new trip — never cuts its line
  // at the old row.
  const [picked, setPicked] = useState<{ directionId: string; rowId: string } | null>(null);
  const live = picked && picked.directionId === selected?.id ? picked : null;

  // An end of the trip, picked from its row: the line stays whole, its dot
  // picked like a hintuan's (the owner's asks, 2026-09-29: "tapping
  // Novaliches should indicate green circle too", then the origin: "it
  // should have!"). One pick at a time with the hintuans; kept by
  // direction, as a pick is.
  const [atEnd, setAtEnd] = useState<{ directionId: string; end: 'from' | 'to' } | null>(null);
  const endPicked = selected && atEnd?.directionId === selected.id ? atEnd.end : null;

  // The camera as the first hintuan or end was picked: a second tap on the
  // picked row brings it back (the owner's asks, 2026-10-02, and for the
  // ends 2026-10-03). Another row picked meanwhile keeps the first one's;
  // another ride lets it go.
  const before = useRef<{ center: LngLat; zoom: number; bearing: number; pitch: number } | null>(
    null,
  );

  // A different direction is a different ride, and so is the same one opened
  // again: start it whole.
  useEffect(() => {
    setPicked(null);
    setAtEnd(null);
    before.current = null;
  }, [selected?.id]);

  // Called as a glide starts, so a fresh function each render moves nothing.
  const onGlide = useRef(opts.onGlide);
  onGlide.current = opts.onGlide;

  const cut = useMemo(
    () => (selected && live ? rideCut(selected, hotspots, live.rowId) : null),
    [selected, hotspots, live],
  );

  /** Keeps the camera as the first pick is made; a later pick keeps the first one's. */
  const remember = useCallback(() => {
    if (!map || before.current) return;
    const c = map.getCenter();
    before.current = {
      center: [c.lng, c.lat],
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    };
  }, [map]);
  /** The picked row again: the camera back where it was. */
  const goBack = useCallback(() => {
    const was = before.current;
    before.current = null;
    if (map && was) map.easeTo({ ...was, duration: 700 }, APP_MOVE);
  }, [map]);

  /** A hintuan row picks its ride (again puts it back); an end row passes null. */
  const selectedId = selected?.id;
  const liveRow = live?.rowId ?? null;
  const pick = useCallback(
    (id: string | null) => {
      setAtEnd(null);
      if (id !== null && selectedId && liveRow === id) goBack();
      else if (id !== null && selectedId) remember();
      else if (id === null) before.current = null;
      setPicked((cur) =>
        id === null || !selectedId || (cur?.directionId === selectedId && cur.rowId === id)
          ? null
          : { directionId: selectedId, rowId: id },
      );
    },
    [selectedId, liveRow, remember, goBack],
  );

  /**
   * An end row: the whole ride again, that end picked, and the map gliding
   * in to it as to a picked hintuan. A second tap lets it go, the camera
   * back where it was, as a hintuan's does.
   */
  const toEnd = useCallback(
    (end: 'from' | 'to') => {
      setPicked(null);
      const on = endPicked !== end;
      setAtEnd(on && selectedId ? { directionId: selectedId, end } : null);
      if (!on) return goBack();
      if (!map || !selected) return;
      const line = travelLine(selected, hotspots);
      if (line.length < 2) return;
      remember();
      const at = end === 'from' ? line[0] : line[line.length - 1];
      const glide = glideFor(map, at, onGlide.current?.() ?? [0, 0]);
      if (glide) map.easeTo({ ...glide, duration: 700 }, APP_MOVE);
    },
    [map, selected, selectedId, hotspots, endPicked, remember, goBack],
  );

  // Glide to where the rider would get off, in to where the scale bar reads
  // 500 m (the owner's ask, 2026-10-02; the stretch fitted whole zoomed far
  // out, 2026-09-28), or, closer in than 300 m, at the visitor's own zoom
  // (glideFor). `offset`, never `padding`: MapLibre keeps a padding for
  // every later move, and a trip's fit or "Where am I" would land off centre
  // ever after.
  useEffect(() => {
    if (!map || !cut) return;
    const glide = glideFor(map, cut.at, onGlide.current?.() ?? [0, 0]);
    if (glide) map.easeTo({ ...glide, duration: 700 }, APP_MOVE);
  }, [map, cut]);

  const pickedHotspot = live ? hotspots.find((s) => s.id === live.rowId) : undefined;
  const pickedLabel = pickedHotspot ? hotspotLabel(pickedHotspot) : null;
  const line = selected?.route?.routeCode;
  // Kept one object while the cut is, so the lit rides are not made anew each render.
  const ridden = useMemo(
    () =>
      cut && selectedId ? { directionId: selectedId, line: cut.ridden, rest: cut.rest } : null,
    [cut, selectedId],
  );

  return {
    rideTo: cut && live ? { hotspotId: live.rowId, metres: cut.metres } : null,
    /** The row picked, cut or not: a row whose box the line misses is still shown picked, with nothing to price. */
    pickedId: live?.rowId ?? null,
    /**
     * The ride from its start to the picked hintuan, where it now ends,
     * and `rest`, the way on from there to the end, drawn in the trip's pale
     * (useLitRides; the owner's ask, 2026-10-12). Null with nothing cut.
     */
    ridden,
    /**
     * Where the picked hintuan is: where the ride would end on the line, as
     * the glide goes; for a row whose box the line misses, the hintuan's own
     * point. Null with nothing picked.
     */
    pinAt: live ? (cut?.at ?? pickedHotspot?.point.coordinates ?? null) : null,
    /** The picked hintuan's name, as its row reads it: the circle's title on the map (HintuanPin). */
    pickedLabel,
    /**
     * On a train line, the picked station's code, GL02, in a white chip
     * before its name on the map (HintuanPin, RouteLineLabel's CodeSignEnd,
     * 2026-10-13; a box left of its circle from the owner's LRTHintuanCodes
     * of 2026-10-12); null for a jeepney's hintuan, the ferry's, and a
     * station the table does not know.
     */
    pickedCode: pickedLabel && isRailLine(line) ? stationCode(line, pickedLabel) : null,
    pick,
    /** The end picked from its row (`toEnd`), or null. */
    endPicked,
    toEnd,
  };
}
