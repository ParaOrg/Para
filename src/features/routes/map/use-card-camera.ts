import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, useState, type RefObject } from 'react';

import type { SheetHeight } from '@/shared/ui/bottom-sheet';
import type { Snap } from '@/shared/ui/sheet-gesture';
import { clearOfSheet } from '@/shared/ui/sheet-room';
import type { LngLat } from '@/shared/utils/geo';

import {
  useCameraBefore,
  useHeightOverview,
  useRideOverview,
  useSwitchOverview,
} from './use-overviews';
import { useRideTo } from './use-ride-to';
import type { Highlight } from './use-saved-routes';
import { framedBy, type Framed } from '../cards/card-stack';
import type { PickedPlace } from '../cards/route-card-stack';
import type { Hotspot } from '../model/hotspots';
import { nearestStopOn, walkToLandmark, type HintuanNearHere } from '../model/landmark-search';
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
 * map gliding there; the overviews of use-overviews.ts — SWITCH, an end
 * picked, the sheet settled at another height — and the camera from before a
 * RouteCard was picked on a hotspot's card, back as it is let go; and the card
 * buttons that move it. Opening a trip, picking a RouteCard and opening the
 * route list leave the camera where the commuter had it. `root` goes on the page,
 * `tripDock` on the trip card, `hotspotDock` on a hotspot's.
 *
 * `camera: false` turns those off: the overviews and the camera kept from
 * before get no map and do nothing, while a picked hintuan still glides. It
 * is fixed for the page's life, not a switch for while drawing: turned on
 * later, the trip's and the card's overviews would fire at once for whatever
 * is open.
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
  // A trip opened from a card — a list's, a hotspot's, a tail's name — and
  // its ‹: the camera the commuter had as they tapped, back with the card
  // (the owner's call: a hintuan's card, zoomed in, a RouteCard's row, ‹, and
  // in again where they were). A hotspot's card picked first comes back at
  // rest, so the camera from before that pick. One trip opening another
  // ("Other routes") keeps the first one's.
  const beforeTrip = useCameraBefore(cam);
  const keepForTrip = () => {
    if (saved.selected) return;
    beforeTrip.keep(saved.highlight?.where === 'hotspot' ? before.held() : null);
  };
  // Closed any other way — ✕, a place's card in front — it is let go, so a
  // trip opened later by a tap on its line has no camera of another's to go back to.
  const tripOpen = !!saved.selected;
  useEffect(() => {
    if (!tripOpen) beforeTrip.forget();
  }, [tripOpen, beforeTrip]);
  // SWITCH, on any card: the routes the other way round, whole.
  const [switches, setSwitches] = useState(0);
  const switched = () => setSwitches((n) => n + 1);
  useSwitchOverview(cam, saved.litDirections, switches, openSheet, cards.snap);
  // A ride from a start to an end (the owner's call): what the camera takes
  // in once the end is picked (pickOnTrip, endOnTrip), and what the trip
  // frames as the sheet settles, in place of its whole route.
  const rideLine = ride.startId !== null ? (ride.ridden?.line ?? null) : null;
  const [endPicks, setEndPicks] = useState(0);
  useRideOverview(cam, rideLine && [rideLine], endPicks, openSheet, cards.snap);
  /**
   * An end picked after a start: the camera takes in the ride, the sheet left where it is (the
   * owner's rule: once raised, the commuter moves it).
   */
  const takeInTheRide = () => setEndPicks((n) => n + 1);
  // The sheet settled at another height: what the card on show frames, again,
  // in the map it leaves — a trip's route, or its ride from a start to an
  // end; a picked card's routes or what the list lights, a hotspot's place
  // (framedBy).
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
  useHeightOverview(cam, cards.snap, framed, openSheet);

  return {
    root,
    tripDock,
    hotspotDock,
    ride,
    openSheet,
    switched,

    /** Where the commuter's own position sits as the camera follows it: clear of the card on show. */
    clearOfOpen: (): [number, number] =>
      map ? clearOfSheet(map.getContainer(), openSheet(), cards.snap) : [0, 0],

    /** A route picked on a card: its trip, the camera as it was kept for the trip's ‹. */
    openTrip: (v: { id: string }, livery?: Livery) => {
      keepForTrip();
      cards.openTrip(v, livery);
    },

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
     * A route picked on a place's card: its trip, the camera as it was kept for the trip's ‹. With
     * a landmark the goal (ticket 07), its end is already picked at the hintuan nearest the
     * landmark that the route stops at.
     */
    openTripFromPlace: (v: Direction, livery?: Livery) => {
      keepForTrip();
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

    /** The trip's ‹ (useCardStack's), and the camera from before the trip back with the card. Null: no ‹. */
    backFromTrip: cards.backFromTrip
      ? () => {
          cards.backFromTrip?.();
          beforeTrip.back();
        }
      : null,

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
     * SWITCH on a trip: the other way round, and the camera with it. On a
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
      switched();
    },

    /** SWITCH on the route list. */
    flipList: () => {
      saved.flip();
      switched();
    },

    /** The route list's filter: the camera takes in what it leaves lit, as for SWITCH (the owner's call). */
    filterList: (filter: ModeFilter) => {
      saved.filterModes(filter);
      switched();
    },

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

    /** A tail's name with no trip open: its ride's trip, in the colour of the card picked, if one is. */
    openRide: (id: string) => {
      const v = saved.directions.find((x) => x.id === id);
      if (!v) return;
      keepForTrip();
      cards.openTrip(v, saved.highlight?.livery);
    },
  };
}
