import type { MapLibreMap } from 'maplibre-gl';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { LngLat } from '@/shared/utils/geo';
import { lineLength } from '@/shared/utils/geo';

import { APP_MOVE } from './map-view';
import { glideFor } from './ride-glide';
import { useRidePicks } from './use-ride-picks';
import { hotspotLabel, type Hotspot } from '../model/hotspots';
import { tipOnRide, type TipOnRide } from '../model/loop-tip';
import { boxTheOtherWay } from '../model/places';
import { stationCode } from '../model/rail-codes';
import { rideCut, rideSpan, rideToEnd, travelLine } from '../model/ride';
import { carryPicks } from '../model/ride-carry';
import { directionEnds, isLoop, isRailLine, railLineOf, type Direction } from '../model/routes';

/**
 * The ride between the picks as the map draws it (useLitRides): `line`, the
 * ride on the trip's own line from the start to the end, and `pale`, the
 * stretches outside it, in the card's pale. `isBackwards`: the end comes
 * before the start, and the chevrons flow from the S to the E (rideSpan).
 */
export interface Ridden {
  directionId: string;
  line: readonly LngLat[];
  pale: readonly (readonly LngLat[])[];
  isBackwards: boolean;
  /** On a loop, where its tip lies on the ride: the start, the end, passed through, or outside it. */
  atTip?: TipOnRide;
}

/**
 * A hintuan picked on the trip card (Timeline State=Selected): its pill prices
 * the ride from the start to there, and the map glides there clear of the
 * card. The route stays whole (the owner's call), a circle popping up where
 * `pinAt` says (hintuan-pin.tsx), in the studio as on the public map. Tapping
 * the row again, an end row,
 * another route or the card away lets the pick go. An end row glides there
 * (`toEnd`), so a rider can look along the route from end to end, in as close
 * as a hintuan is brought; with a start picked, it is the ride's end instead,
 * the camera taking in the ride.
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
     * A loop's tip (useLoopTip): the row its trip leaves from and comes back
     * to. A ride round a loop is measured from it, and its ends are the tip.
     */
    tipId?: string | null;
  } = {},
) {
  const { live, liveStart, endPicked, setPicked, setAtEnd, setStartPick, setStart, removeStart } =
    useRidePicks(selected);

  // The camera as the first hintuan or end was picked: a second tap on the
  // picked row brings it back. Another row picked meanwhile keeps the first one's;
  // another ride lets it go.
  const before = useRef<{ center: LngLat; zoom: number; bearing: number; pitch: number } | null>(
    null,
  );

  // A different direction is a different ride, and so is the same one opened
  // again: its picks are let go (useRidePicks), the camera kept for a second
  // tap after.
  useEffect(() => {
    before.current = null;
  }, [selected?.id]);

  // The hintuan a jeep's SWITCH carried over: the camera frames the whole ride
  // as SWITCH does (useSwitchOverview) and never glides in to it. A row picked
  // after lets it go.
  const carried = useRef<string | null>(null);

  const tipId = opts.tipId ?? null;

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
  // leaves) to the picked hintuan, on the trip's own line, back along it for
  // an end above the start (rideSpan); or from the start to an end row picked
  // with it kept (rideToEnd). A start alone is no ride yet, the trip left
  // whole until its end is picked (Variant3).
  const span = useMemo(() => {
    if (!selected) return null;
    if (live) return rideSpan(selected, hotspots, liveStart?.rowId ?? null, live.rowId, tipId);
    if (liveStart && endPicked) {
      return rideToEnd(selected, hotspots, liveStart.rowId, endPicked, tipId);
    }
    return null;
  }, [selected, hotspots, live, liveStart, endPicked, tipId]);

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
    [selectedId, liveRow, startRow, remember, goBack, setPicked, setAtEnd, setStartPick],
  );

  /**
   * An end row: that end picked, and the map gliding in to it as to a picked
   * hintuan; with no start, the whole ride again. With a start, it is the
   * ride's end, the start kept, and the camera takes in the ride rather
   * than gliding (useCardCamera's endOnTrip). A second tap lets it go, the
   * camera back where it was, as a hintuan's does.
   */
  const toEnd = useCallback(
    (end: 'from' | 'to') => {
      setPicked(null);
      carried.current = null;
      const on = endPicked !== end;
      setAtEnd(on && selectedId ? { directionId: selectedId, end } : null);
      if (!on) return goBack();
      // A ride to take in: the camera frames it (endOnTrip) rather than gliding.
      if (startRow !== null && selected && rideToEnd(selected, hotspots, startRow, end, tipId)) {
        return remember();
      }
      if (!map || !selected) return;
      const line = travelLine(selected, hotspots);
      if (line.length < 2) return;
      remember();
      // A loop's two ends are its tip: the glide goes to its dot, not to where the line was drawn from.
      const tipAt = isLoop(selected) && tipId ? rideCut(selected, hotspots, tipId)?.at : undefined;
      const at = tipAt ?? (end === 'from' ? line[0] : line[line.length - 1]);
      const glide = glideFor(map, at, onGlide.current?.() ?? [0, 0]);
      if (glide) map.easeTo({ ...glide, duration: 700 }, APP_MOVE);
    },
    [
      map,
      selected,
      selectedId,
      hotspots,
      endPicked,
      startRow,
      tipId,
      remember,
      goBack,
      setPicked,
      setAtEnd,
    ],
  );

  // Glide to where the rider would get off, at the commuter's own zoom and
  // only when that place is not in view clear of the card (glideFor). `offset`,
  // never `padding`: MapLibre keeps a padding for every later move, and a
  // trip's fit or "Where am I" would land off centre ever after. An end
  // picked after a start, with a ride between them, does not glide: the
  // camera takes in that ride (useCardCamera's pickOnTrip). With none to take
  // in (a box the line misses) it glides to the end as any pick does. Read as
  // the cut changes, so letting the start go moves nothing. Kept before the
  // glide's effect, which reads it in the same commit.
  const isRideFramed = useRef(false);
  useEffect(() => {
    isRideFramed.current = liveStart !== null && span !== null;
  });
  useEffect(() => {
    if (!map || !cut || carried.current === cut.endHotspotId || isRideFramed.current) return;
    const glide = glideFor(map, cut.at, onGlide.current?.() ?? [0, 0]);
    if (glide) map.easeTo({ ...glide, duration: 700 }, APP_MOVE);
  }, [map, cut]);

  const pickedHotspot = live ? hotspots.find((s) => s.id === live.rowId) : undefined;
  const pickedLabel = pickedHotspot ? hotspotLabel(pickedHotspot) : null;
  // The ride's end: the picked hintuan, or, with a start, the end of the trip
  // picked from its row, whose pill names its station too.
  const endLabel =
    pickedLabel ?? (liveStart && endPicked && selected ? directionEnds(selected)[endPicked] : null);
  const startHotspot = liveStart ? hotspots.find((s) => s.id === liveStart.rowId) : undefined;
  const startLabel = startHotspot ? hotspotLabel(startHotspot) : null;
  const line = selected?.route?.routeCode;
  // Kept one object while the span is, so the lit rides are not made anew each render.
  const ridden = useMemo((): Ridden | null => {
    if (!span || !selected) return null;
    const atTip = isLoop(selected) ? tipOnLoop(selected, hotspots, tipId, liveStart, live) : null;
    return {
      directionId: selected.id,
      line: span.ridden,
      pale: [span.before, span.rest].filter((l) => l.length > 1),
      isBackwards: span.isBackwards,
      ...(atTip ? { atTip } : {}),
    };
  }, [span, selected, hotspots, tipId, liveStart, live]);

  /**
   * SWITCH on a jeep's trip, just before it turns: the picks go with it to
   * `next`, each landing where HintuanCard's SWITCH puts its place
   * (boxTheOtherWay), by the rules of carryPicks. On a train SWITCH lets the
   * picks go.
   */
  const carryTo = useCallback(
    (next: Direction, passesNext: (hotspotId: string) => boolean) => {
      if (railLineOf(next)) return;
      const land = (rowId: string): string | null => {
        const box = hotspots.find((s) => s.id === rowId);
        return box ? (boxTheOtherWay(box, hotspots, passesNext)?.id ?? null) : null;
      };
      const carriedPicks = carryPicks(
        { start: liveStart?.rowId ?? null, picked: live?.rowId ?? null, endPicked },
        land,
      );
      if (carriedPicks.start !== null) {
        setStartPick({ directionId: next.id, rowId: carriedPicks.start });
      }
      if (carriedPicks.picked !== null) {
        carried.current = carriedPicks.picked;
        setPicked({ directionId: next.id, rowId: carriedPicks.picked });
      }
      if (carriedPicks.endPicked !== null) {
        setAtEnd({ directionId: next.id, end: carriedPicks.endPicked });
      }
    },
    [live, liveStart, hotspots, endPicked, setPicked, setAtEnd, setStartPick],
  );

  return {
    /** The ride between the picks, how far it runs; null with no ride to price. */
    rideTo: span ? { metres: span.metres } : null,
    /** The row picked, cut or not: a row whose box the line misses is still shown picked, with nothing to price. */
    pickedId: live?.rowId ?? null,
    /**
     * The ride between the picks, and the way not ridden on either side of
     * it, drawn in the trip's pale (useLitRides). Null with nothing cut.
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
     * before its name on the map (HintuanPin, RouteLineLabel's CodeSignEnd);
     * with a start, an end of the trip picked as the ride's end names its own
     * station, for its pill on the card. Null for a jeepney's hintuan, the
     * ferry's, and a station the table does not know.
     */
    pickedCode: endLabel && isRailLine(line) ? stationCode(line, endLabel) : null,
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

/**
 * Where a loop's tip lies on the ride the picks make (tipOnRide), measured along
 * its line. A start with no end of its own is an end row picked: the tip again.
 */
function tipOnLoop(
  v: Direction,
  hotspots: readonly Hotspot[],
  tipId: string | null,
  start: { rowId: string } | null,
  end: { rowId: string } | null,
): TipOnRide {
  const metresOf = (rowId: string | null) =>
    rowId === null ? null : (rideCut(v, hotspots, rowId)?.metres ?? null);
  return tipOnRide(
    lineLength(travelLine(v, hotspots)),
    metresOf(tipId) ?? 0,
    metresOf(start?.rowId ?? null),
    metresOf(end?.rowId ?? null),
  );
}
