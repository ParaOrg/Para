import type { SheetHeight } from '@/shared/ui/bottom-sheet';

import type { RouteCardsState } from './use-route-cards';
import type { useSavedHotspots } from './use-saved-hotspots';
import type { useSavedRoutes } from './use-saved-routes';
import type { Hotspot } from '../model/hotspots';
import type { Livery } from '../model/liveries';
import type { Direction } from '../model/routes';
import type { Timeline } from '../model/timeline';

type Camera<V extends Direction, S extends Hotspot> = RouteCardsState<V, S>['camera'];

/** What a page's trip card is handed by RouteCards: the open trip, and what its buttons do. */
export interface OpenTrip<V extends Direction, S extends Hotspot> {
  direction: V;
  directions: readonly V[];
  timeline: Timeline;
  /** The colour it opened in, kept through SWITCH. */
  livery: Livery;
  /** The ride on it: the picked hintuan, the start, the end (useRideTo). */
  ride: Camera<V, S>['ride'];
  /** How far the ride to the picked hintuan runs: the full line's, none while only its overview is here. */
  pickedMetres: number | undefined;
  /** The walk from the trip's end to a landmark made the goal, in words; null unless that end is picked. */
  walk: Camera<V, S>['walk'];
  tripDock: Camera<V, S>['tripDock'];
  /** The sheets' shared height. */
  height: SheetHeight;
  switchTrip: Camera<V, S>['switchTrip'];
  /** "Other routes": that route's trip in this one's place, leaving to what this one was picked from. */
  otherRoute: Camera<V, S>['otherRoute'];
  /** The trip's ‹ or ✕: back to what it was picked from, or everything closed. */
  leaveTrip: () => void;
  /** A row or an end picked, and a ride's start set or removed; null where ride picking is off. */
  picking: {
    pick: Camera<V, S>['pickOnTrip'];
    end: Camera<V, S>['endOnTrip'];
    setStart: () => void;
    removeStart: () => void;
  } | null;
  hasController: boolean;
}

/** What a page's hotspot card is handed by RouteCards: the place picked, and what its rows do. */
export interface OpenPlace<V extends Direction, S extends Hotspot> {
  /** The box picked; another box of the place keeps the card as it is. */
  hotspot: S;
  hotspots: readonly S[];
  linkedDirectionIds: (id: string) => readonly string[];
  directions: readonly V[];
  /** Kept but not shown, behind a trip picked from it. */
  isHidden: boolean;
  height: SheetHeight;
  hotspotDock: Camera<V, S>['hotspotDock'];
  /** What the card's RouteCards show, for the map to light. */
  showCard: (ids: readonly string[] | null) => void;
  /** SWITCH on the card: the other way round, a box of the place selected, the camera kept. */
  switchBox: (box: string | null) => void;
  /** A route picked on the card: its trip. */
  openTrip: Camera<V, S>['openTripFromPlace'];
  /** No row Selected: the Selected one tapped again let it go. */
  isDeselected: boolean;
  deselect: () => void;
  /** Another box: the map goes there, the box clear of the card, which keeps its height. */
  pickBox: (id: string) => void;
  /** ‹ back to the trip it was opened over; null: no ‹. */
  back: (() => void) | null;
  close: () => void;
}

/** The open trip, as a trip card needs it; null with none open or its timeline not worked out. */
export function openTripOf<V extends Direction, S extends Hotspot>(
  saved: ReturnType<typeof useSavedRoutes<V>>,
  { cards, camera, timeline, leaveTrip, options }: RouteCardsState<V, S>,
): OpenTrip<V, S> | null {
  const { ride } = camera;
  if (!saved.selected || !cards.tripLivery || !timeline) return null;
  return {
    direction: saved.selected,
    directions: saved.directions,
    timeline,
    livery: cards.tripLivery,
    ride,
    pickedMetres: saved.fullIds.has(saved.selected.id) ? ride.rideTo?.metres : undefined,
    walk: camera.walk,
    tripDock: camera.tripDock,
    height: cards.height,
    switchTrip: camera.switchTrip,
    otherRoute: camera.otherRoute,
    leaveTrip,
    picking: options.isRidePickingOn
      ? {
          pick: camera.pickOnTrip,
          end: camera.endOnTrip,
          setStart: ride.setStart,
          removeStart: ride.removeStart,
        }
      : null,
    hasController: options.hasController,
  };
}

/** The hotspot picked, as a hotspot card needs it; null with none picked. */
export function openPlaceOf<V extends Direction, S extends Hotspot>(
  saved: ReturnType<typeof useSavedRoutes<V>>,
  hotspots: ReturnType<typeof useSavedHotspots<S>>,
  { cards, camera, backToTrip, closePlace }: RouteCardsState<V, S>,
): OpenPlace<V, S> | null {
  if (!hotspots.selected) return null;
  return {
    hotspot: hotspots.selected,
    hotspots: hotspots.hotspots,
    linkedDirectionIds: hotspots.linkedDirectionIds,
    directions: saved.directions,
    isHidden: !!saved.selected,
    height: cards.height,
    hotspotDock: camera.hotspotDock,
    showCard: saved.showCard,
    switchBox: (box) => box && hotspots.select(box),
    openTrip: camera.openTripFromPlace,
    isDeselected: hotspots.letGone,
    deselect: () => {
      saved.highlightCard(null);
      hotspots.letGo();
    },
    pickBox: (id) => {
      saved.highlightCard(null);
      hotspots.show(id, cards.clearOf(camera.hotspotDock));
    },
    back: backToTrip,
    close: closePlace,
  };
}
