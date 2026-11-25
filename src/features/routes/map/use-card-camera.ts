import type { MapLibreMap } from 'maplibre-gl';
import { useRef, useState, type RefObject } from 'react';

import type { SheetHeight } from '@/shared/ui/bottom-sheet';
import type { Snap } from '@/shared/ui/sheet-gesture';
import type { LngLat } from '@/shared/utils/geo';

import { clearOfSheet } from './sheet-room';
import { useOverview } from './use-overview';
import { useCameraBefore, useRideOverview } from './use-overviews';
import { useRideTo } from './use-ride-to';
import type { Highlight } from './use-saved-routes';
import { framedBy, type Framed } from '../cards/card-stack';
import type { PickedPlace } from '../cards/route-card-stack';
import type { Hotspot } from '../model/hotspots';
import { nearestStopOn, walkToLandmark, type HintuanNearHere } from '../model/landmark-goal';
import type { Livery } from '../model/liveries';
import type { ModeFilter } from '../model/mode-filter';
import { routeTimeline } from '../model/ride';
import { directionLine, type Direction } from '../model/routes';
import { rowOfBox } from '../model/timeline';
import type { Landmark } from '../published/landmark-file-schema';

/**
 * A landmark made the goal by "Go here" (ticket 07): the hintuans near it, and, once a route is
 * opened from the place's card, where that trip's end was picked for it.
 */
interface LandmarkGoal {
  landmark: Landmark;
  near: readonly HintuanNearHere[];
  end: { directionId: string; rowId: string; distanceM: number } | null;
}

interface Routes<V extends Direction> {
  directions: readonly V[];
  selected: V | null;
  highlight: Highlight | null;
  litDirections: readonly V[];
  select: (id: string | null, opts?: { keepList?: boolean }) => void;
  flip: () => void;
  filterModes: (filter: ModeFilter) => void;
  highlightCard: (h: Highlight | null) => void;
}

interface Hotspots<S extends Hotspot> {
  hotspots: readonly S[];
  selected: S | null;
  /** The directions that pass a hotspot (its links): what a jeep's SWITCH carries its pick by. */
  linkedDirectionIds: (hotspotId: string) => readonly string[];
  /** The hotspots a direction passes, along its line: the other way's rows a SWITCH lands on. */
  hotspotsAlong: (directionId: string, line: readonly LngLat[]) => S[];
}

interface Cards {
  /** Any card up: with none, a landmark's "Go here" is let go. */
  open: boolean;
  snap: Snap;
  backFromTrip: (() => void) | null;
  height: SheetHeight;
  choosing: boolean;
  clearOf: (dock: RefObject<HTMLElement | null>) => () => [number, number];
  openPlace: (hotspotId: string, dock: RefObject<HTMLElement | null>) => void;
  openTrip: (v: { id: string }, livery?: Livery) => void;
}

/**
 * The camera with the cards, for both apps: a hintuan picked on a trip, the
 * map gliding there; an end picked, the ride taken in; the Overview button's
 * (useOverview); and the camera from before a RouteCard was picked on a
 * hotspot's card, back as it is let go. Choosing a route moves nothing (the
 * owner, 2026-11-23): opening a trip, leaving it, SWITCH, the filter, opening
 * the route list and the sheet changing height leave the camera where the
 * commuter had it, and the Overview button frames what is open when asked.
 * `root` goes on the page, `tripDock` on the trip card, `hotspotDock` on a
 * hotspot's.
 *
 * `camera: false` turns those off: the overviews and the camera kept from
 * before get no map and do nothing, while a picked hintuan still glides. It
 * is fixed for the page's life, not a switch for while drawing.
 */
export function useCardCamera<V extends Direction, S extends Hotspot>(
  map: MapLibreMap | null,
  saved: Routes<V>,
  hotspots: Hotspots<S>,
  cards: Cards,
  opts: {
    camera?: boolean;
    /** A loop's tip (useLoopTip): where its trip leaves and comes back to, which a ride round it is measured from. */
    tipId?: string | null;
  } = {},
) {
  // The map the overviews and the camera kept from before move: none with
  // the camera off (see above).
  const cam = opts.camera === false ? null : map;

  // A hintuan picked on the trip card (the owner's Timeline State=Selected):
  // the camera gliding there clear of the card, and a circle popping up on it
  // — the route left whole, no get-off circles (the owner's call). The card
  // stays at its height (clearOfSheet).
  const tripDock = useRef<HTMLDivElement>(null);
  // The HintuanCard's, for a picked box to land clear of it.
  const hotspotDock = useRef<HTMLDivElement>(null);
  const ride = useRideTo(map, saved.selected, hotspots.hotspots, {
    onGlide: () => cards.clearOf(tripDock)(),
    tipId: opts.tipId ?? null,
  });
  // "Go here" from a landmark (ticket 07). Gone with the cards: once none is up, the trip it was
  // for is over. Let go in the render that finds them closed, as the ride's picks are (useRidePicks).
  const [goal, setGoal] = useState<LandmarkGoal | null>(null);
  if (goal && !cards.open) setGoal(null);
  // The walk from the trip's end to the landmark, while that end is the one picked for it.
  const walk =
    goal?.end && saved.selected?.id === goal.end.directionId && ride.pickedId === goal.end.rowId
      ? walkToLandmark(goal.end.distanceM, goal.landmark.name)
      : null;
  // The page, and the card's sheet on show in it, for what the camera keeps clear of.
  const root = useRef<HTMLDivElement>(null);
  const openSheet = () =>
    root.current?.querySelector<HTMLElement>('[data-floats]:not([hidden])') ?? null;
  // A RouteCard picked on a hotspot's card and let go: the camera the commuter had before it.
  const before = useCameraBefore(cam);
  // A ride from a start to an end (the owner's call): what the camera takes
  // in once the end is picked (pickOnTrip, endOnTrip), and what the trip's
  // Overview frames, in place of its whole route.
  const rideLine = ride.startId !== null ? (ride.ridden?.line ?? null) : null;
  const [endPicks, setEndPicks] = useState(0);
  useRideOverview(cam, rideLine && [rideLine], endPicks, openSheet, cards.snap);
  /**
   * An end picked after a start: the camera takes in the ride, the sheet left where it is (the
   * owner's rule: once raised, the commuter moves it).
   */
  const takeInTheRide = () => setEndPicks((n) => n + 1);
  // What the Overview button frames: a trip's route or ride, a picked card's routes (framedBy).
  const framed = (): Framed => {
    const ids = saved.highlight && new Set(saved.highlight.ids);
    const picked = ids && saved.directions.filter((v) => ids.has(v.id));
    return framedBy(
      saved.selected,
      rideLine,
      hotspots.selected?.point.coordinates ?? null,
      cards.choosing,
      picked,
      saved.litDirections,
    );
  };
  // The button is for a trip, a picked RouteCard and the route list's lit routes; the name changes
  // with what it would frame, so a SWITCH or a filter starts away from the new routes' overview.
  const framing = saved.selected
    ? `trip:${saved.selected.id}:${ride.startId ?? ''}:${ride.endPicked ?? ''}`
    : saved.highlight
      ? `cards:${saved.highlight.ids.join(',')}`
      : cards.choosing && `list:${saved.litDirections.map((v) => v.id).join(',')}`;
  const overviewButton = useOverview(cam, framing || null, framed(), openSheet, cards.snap);

  return {
    root,
    tripDock,
    hotspotDock,
    ride,
    openSheet,
    overviewButton,

    /** Where the commuter's own position sits as the camera follows it: clear of the card on show. */
    clearOfOpen: (): [number, number] =>
      map ? clearOfSheet(map.getContainer(), openSheet(), cards.snap) : [0, 0],

    /** A route picked on a card: its trip, the camera left where it is. */
    openTrip: (v: { id: string }, livery?: Livery) => cards.openTrip(v, livery),

    /** The landmark "Go here" made the goal, while it holds: its pin stays on the map. */
    goalLandmark: goal?.landmark ?? null,
    /** The walk to it from the trip's end, in words for the trip card; null unless that end is picked. */
    walk,

    /**
     * "Go here" on a hintuan near a landmark (ticket 07): the landmark made the goal, and the
     * hintuan's place opened, its routes listed as a tap on its name lists them.
     */
    goHere: (landmark: Landmark, near: readonly HintuanNearHere[], hotspotId: string) => {
      setGoal({ landmark, near, end: null });
      cards.openPlace(hotspotId, tripDock.current ? tripDock : hotspotDock);
    },

    /** The search started over: the goal let go. */
    letGoalGo: () => setGoal(null),

    /**
     * A route picked on a place's card: its trip, the camera left where it is. With a landmark the
     * goal (ticket 07), its end is already picked at the hintuan nearest the landmark that the
     * route stops at.
     */
    openTripFromPlace: (v: Direction, livery?: Livery) => {
      cards.openTrip(v, livery);
      const stop = goal && nearestStopOn(v.id, goal.near);
      if (!stop) return;
      const timeline = routeTimeline(
        v,
        hotspots.hotspots,
        hotspots.hotspotsAlong(v.id, directionLine(v)),
      );
      const rows = [timeline.from, ...timeline.between, timeline.to].filter((r) => r !== null);
      const rowId = rowOfBox(stop.hintuan, rows, hotspots.hotspots);
      if (!rowId) return;
      ride.pickOn(v.id, rowId);
      setGoal({ ...goal, end: { directionId: v.id, rowId, distanceM: stop.distanceM } });
    },

    /** The trip's ‹ (useCardStack's), the camera left where it is. Null: no ‹. */
    backFromTrip: cards.backFromTrip,

    /**
     * A row picked on the trip, or its dot on the map (useRideTo's pick). An
     * end picked after a start takes the camera in to the ride between them,
     * the sheet left where it is (the owner's rule).
     */
    pickOnTrip: (id: string | null) => {
      const isNewEnd =
        id !== null && ride.startId !== null && id !== ride.startId && id !== ride.pickedId;
      ride.pick(id);
      if (isNewEnd) takeInTheRide();
    },

    /**
     * The origin's row or the destination's on the trip (useRideTo's toEnd).
     * With a start, it is the ride's end, and the camera takes in the ride as
     * for a hintuan picked as the end (the owner's call: keep the start);
     * with none, the map glides to it.
     */
    endOnTrip: (end: 'from' | 'to') => {
      const isNewEnd = ride.startId !== null && ride.endPicked !== end;
      ride.toEnd(end);
      if (isNewEnd) takeInTheRide();
    },

    /**
     * SWITCH on a trip: the other way round, the camera left where it is. On a
     * jeep, the picked hintuan goes with it, onto a box the other way passes
     * (carryTo; the owner's call).
     */
    switchTrip: (v: Direction) => {
      const timeline = routeTimeline(
        v,
        hotspots.hotspots,
        hotspots.hotspotsAlong(v.id, directionLine(v)),
      );
      const rows = [timeline.from, ...timeline.between, timeline.to].filter((r) => r !== null);
      ride.carryTo(v, (hotspotId) => hotspots.linkedDirectionIds(hotspotId).includes(v.id), rows);
      saved.select(v.id, { keepList: true });
    },

    /** SWITCH on the route list, the camera left where it is. */
    flipList: () => saved.flip(),

    /** The route list's filter, "Show all routes" among its choices, the camera left where it is. */
    filterList: (filter: ModeFilter) => saved.filterModes(filter),

    /**
     * A trip's "Other routes": that route's trip in this one's place, the
     * sheet left where it is (the owner's rule).
     */
    otherRoute: (v: { id: string }) => saved.select(v.id, { keepList: true }),

    /**
     * A RouteCard on a hotspot's card picked, or let go: the camera from
     * before the first pick kept, and back as the last is let go.
     */
    pickOnPlaceCard: (p: PickedPlace | null) => {
      const pickedHere = saved.highlight?.where === 'hotspot';
      if (!p && pickedHere) before.back();
      else if (p && !pickedHere) before.keep();
      saved.highlightCard(p && { where: 'hotspot', ...p });
    },

    /**
     * A place's name on the map: its card opens at the height the trip's is
     * at, or a hotspot card's.
     */
    openPlace: (hotspotId: string) =>
      cards.openPlace(hotspotId, tripDock.current ? tripDock : hotspotDock),
  };
}
