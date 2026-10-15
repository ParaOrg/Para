import type { EaseToOptions, MapLibreMap } from 'maplibre-gl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { zoomForScale, type LngLat } from '@/shared/utils/geo';

import { APP_MOVE } from './map-view';
import { hotspotLabel, type Hotspot } from '../model/hotspots';
import { boxTheOtherWay } from '../model/places';
import { stationCode } from '../model/rail-codes';
import { endsBeforeStart, rideCut, rideSpan, rideTheOtherWay, travelLine } from '../model/ride';
import { isRailLine, railLineOf, type Direction } from '../model/routes';

/**
 * The ride between the picks as the map draws it (useLitRides): `line`, the
 * ride on the trip's own line, and `pale`, the stretches before the start and
 * after the end, in the card's pale; or, an end picked before the start,
 * the trip's whole line pale and the ride on the other direction's line
 * (`otherWay`).
 */
export interface Ridden {
  directionId: string;
  line: readonly LngLat[];
  pale: readonly (readonly LngLat[])[];
  otherWay: { directionId: string; line: readonly LngLat[] } | null;
}

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
    /**
     * The route's other direction, for an end picked before the start: that
     * ride runs on it, the card left as it is (rideTheOtherWay; the owner,
     * 2026-10-15). Null for a route drawn one way only.
     */
    otherWay?: Direction | null;
    /** The directions that pass a hotspot (its links): where a pick lands on the other way. */
    linkedDirectionIds?: (hotspotId: string) => readonly string[];
  } = {},
) {
  // Which direction the pick was made on: a pick belongs to its ride, so the
  // first render of another one — a new trip, a train's SWITCH — never cuts
  // its line at the old row. A jeep's SWITCH carries it over (carryTo).
  const [picked, setPicked] = useState<{ directionId: string; rowId: string } | null>(null);
  const live = picked && picked.directionId === selected?.id ? picked : null;

  // An end of the trip, picked from its row: the line stays whole, its dot
  // picked like a hintuan's (the owner's asks, 2026-09-29: "tapping
  // Novaliches should indicate green circle too", then the origin: "it
  // should have!"). One pick at a time with the hintuans; kept by
  // direction, as a pick is.
  const [atEnd, setAtEnd] = useState<{ directionId: string; end: 'from' | 'to' } | null>(null);
  const endPicked = selected && atEnd?.directionId === selected.id ? atEnd.end : null;

  // A hintuan made the ride's start by Set as start (the owner's
  // TimelineRouteDetail, 2026-10-15): the ride runs from it, not from where
  // the direction leaves, to the picked hintuan or on to the end. Kept by
  // direction, as the end's pick is.
  const [start, setStartPick] = useState<{ directionId: string; rowId: string } | null>(null);
  const liveStart = start && start.directionId === selected?.id ? start : null;

  // The camera as the first hintuan or end was picked: a second tap on the
  // picked row brings it back (the owner's asks, 2026-10-02, and for the
  // ends 2026-10-03). Another row picked meanwhile keeps the first one's;
  // another ride lets it go.
  const before = useRef<{ center: LngLat; zoom: number; bearing: number; pitch: number } | null>(
    null,
  );

  // A different direction is a different ride, and so is the same one opened
  // again: start it whole. The picks are let go in the render that opens it
  // (the previous id kept to tell), the camera kept for a second tap after —
  // all but one carried over a jeep's SWITCH, which already names the
  // direction it belongs to (carryTo).
  const [rideId, setRideId] = useState(selected?.id);
  if (rideId !== selected?.id) {
    setRideId(selected?.id);
    setPicked((p) => (p?.directionId === selected?.id ? p : null));
    setAtEnd((e) => (e?.directionId === selected?.id ? e : null));
    setStartPick((s) => (s?.directionId === selected?.id ? s : null));
  }
  useEffect(() => {
    before.current = null;
  }, [selected?.id]);

  // The hintuan a jeep's SWITCH carried over: the camera frames the whole ride
  // as SWITCH does (useSwitchOverview) and never glides in to it. A row picked
  // after lets it go.
  const carried = useRef<string | null>(null);

  // Called as a glide starts, so a fresh function each render moves nothing.
  // Kept before the glide's effect below, which reads it in the same commit.
  const onGlide = useRef(opts.onGlide);
  useEffect(() => {
    onGlide.current = opts.onGlide;
  });

  // The picked hintuan on this trip's own line: where the camera glides.
  const cut = useMemo(
    () => (selected && live ? rideCut(selected, hotspots, live.rowId) : null),
    [selected, hotspots, live],
  );

  // The ride between the picks: from the start (or where the direction
  // leaves) to the picked hintuan (or where it goes). An end before the start
  // runs on the other direction's line (the owner's Variant5, 2026-10-15),
  // its picks landing on boxes that way passes.
  const otherWay = opts.otherWay ?? null;
  const linked = opts.linkedDirectionIds;
  const span = useMemo(() => {
    if (!selected || (!live && !liveStart)) return null;
    const startId = liveStart?.rowId ?? null;
    const endId = live?.rowId ?? null;
    if (startId !== null && endId !== null && endsBeforeStart(selected, hotspots, startId, endId)) {
      if (!otherWay || !linked) return null;
      const passes = (id: string) => linked(id).includes(otherWay.id);
      const ride = rideTheOtherWay(otherWay, hotspots, startId, endId, passes);
      return ride && { ...ride, otherWayId: otherWay.id };
    }
    const ride = rideSpan(selected, hotspots, startId, endId);
    return ride && { ...ride, otherWayId: null };
  }, [selected, hotspots, live, liveStart, otherWay, linked]);

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
  const startRow = liveStart?.rowId ?? null;
  const pick = useCallback(
    (id: string | null) => {
      // The start's row tapped again lets the start go, as × Remove as start does.
      if (id !== null && id === startRow) {
        setStartPick(null);
        return;
      }
      setAtEnd(null);
      carried.current = null;
      if (id !== null && selectedId && liveRow === id) goBack();
      else if (id !== null && selectedId) remember();
      else if (id === null) before.current = null;
      setPicked((cur) =>
        id === null || !selectedId || (cur?.directionId === selectedId && cur.rowId === id)
          ? null
          : { directionId: selectedId, rowId: id },
      );
    },
    [selectedId, liveRow, startRow, remember, goBack],
  );

  /**
   * Set as start, under the picked hintuan's row (the owner's Choosing and
   * Variant3, 2026-10-15): it becomes the ride's start, and the ride runs
   * from it to where the direction goes until another row is tapped.
   */
  const setStart = useCallback(() => {
    if (!selectedId || liveRow === null) return;
    setStartPick({ directionId: selectedId, rowId: liveRow });
    setPicked(null);
  }, [selectedId, liveRow]);

  /** × Remove as start: the ride leaves where the direction does again. */
  const removeStart = useCallback(() => setStartPick(null), []);

  /**
   * An end row: the whole ride again, that end picked, and the map gliding
   * in to it as to a picked hintuan. A second tap lets it go, the camera
   * back where it was, as a hintuan's does.
   */
  const toEnd = useCallback(
    (end: 'from' | 'to') => {
      setPicked(null);
      setStartPick(null);
      carried.current = null;
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
    if (!map || !cut || carried.current === cut.endHotspotId) return;
    const glide = glideFor(map, cut.at, onGlide.current?.() ?? [0, 0]);
    if (glide) map.easeTo({ ...glide, duration: 700 }, APP_MOVE);
  }, [map, cut]);

  const pickedHotspot = live ? hotspots.find((s) => s.id === live.rowId) : undefined;
  const pickedLabel = pickedHotspot ? hotspotLabel(pickedHotspot) : null;
  const startHotspot = liveStart ? hotspots.find((s) => s.id === liveStart.rowId) : undefined;
  const startLabel = startHotspot ? hotspotLabel(startHotspot) : null;
  const line = selected?.route?.routeCode;
  // Kept one object while the span is, so the lit rides are not made anew each render.
  const ridden = useMemo((): Ridden | null => {
    if (!span || !selected) return null;
    // The other way round, the trip's own line is all pale and the ride is
    // drawn on the other direction's.
    if (span.otherWayId !== null) {
      return {
        directionId: selected.id,
        line: [],
        pale: [travelLine(selected, hotspots)],
        otherWay: { directionId: span.otherWayId, line: span.ridden },
      };
    }
    return {
      directionId: selected.id,
      line: span.ridden,
      pale: [span.before, span.rest].filter((l) => l.length > 1),
      otherWay: null,
    };
  }, [span, selected, hotspots]);

  /**
   * SWITCH on a jeep's trip, just before it turns: the pick goes with it to
   * `next` (the owner's ask, 2026-10-15: Antipolo → Betty Go becomes Recto →
   * Betty Go). A hintuan lands where HintuanCard's SWITCH puts it
   * (boxTheOtherWay): the same box when `next` passes it, else the nearest
   * box of its place that `next` passes; with none, the ride turns whole. A
   * picked end follows its place: where the trip went is where the way back
   * leaves. On a train SWITCH lets the picks go, as before (the owner, the
   * same day: "trains reset, jeeps keep").
   */
  const carryTo = useCallback(
    (next: Direction, passesNext: (hotspotId: string) => boolean) => {
      if (railLineOf(next)) return;
      const land = (rowId: string) => {
        const box = hotspots.find((s) => s.id === rowId);
        return box ? boxTheOtherWay(box, hotspots, passesNext) : null;
      };
      // A start goes the same way, kept a start (its place's box the other
      // way passes); with none, the ride leaves where the other way does.
      const startLanded = liveStart ? land(liveStart.rowId) : null;
      if (startLanded) setStartPick({ directionId: next.id, rowId: startLanded.id });
      if (live) {
        const landed = land(live.rowId);
        if (!landed) return;
        carried.current = landed.id;
        setPicked({ directionId: next.id, rowId: landed.id });
      } else if (endPicked) {
        setAtEnd({ directionId: next.id, end: endPicked === 'to' ? 'from' : 'to' });
      }
    },
    [live, liveStart, hotspots, endPicked],
  );

  return {
    /** The ride between the picks, how far it runs; null with no ride to price. */
    rideTo: span ? { metres: span.metres, isOtherWay: span.otherWayId !== null } : null,
    /** The row picked, cut or not: a row whose box the line misses is still shown picked, with nothing to price. */
    pickedId: live?.rowId ?? null,
    /**
     * The ride between the picks, and the way not ridden on either side of
     * it, drawn in the trip's pale (useLitRides; the owner's asks of
     * 2026-10-12 and 2026-10-15). Null with nothing cut.
     */
    ridden,
    /**
     * Where the picked hintuan is: where the ride would end on the line, as
     * the glide goes; for a row whose box the line misses, the hintuan's own
     * point. Null with nothing picked.
     */
    pinAt: live ? (span?.at ?? cut?.at ?? pickedHotspot?.point.coordinates ?? null) : null,
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
    /** The row made the ride's start (Set as start), or null: the ride leaves where the direction does. */
    startId: liveStart?.rowId ?? null,
    /** Where the start is on the map: where the ride leaves on the line, else its hintuan's own point. */
    startPinAt: liveStart
      ? (span?.from ??
        (selected ? rideCut(selected, hotspots, liveStart.rowId)?.at : undefined) ??
        startHotspot?.point.coordinates ??
        null)
      : null,
    /** The start's name, as its row reads it. */
    startLabel,
    /** On a train line, the start station's code, as `pickedCode` is the end's. */
    startCode: startLabel && isRailLine(line) ? stationCode(line, startLabel) : null,
    setStart,
    removeStart,
    /** The end picked from its row (`toEnd`), or null. */
    endPicked,
    toEnd,
    carryTo,
  };
}
