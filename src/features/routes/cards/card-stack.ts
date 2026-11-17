import type { Snap } from '@/shared/ui/sheet-gesture';
import type { LngLat } from '@/shared/utils/geo';

import { sharingAnEnd } from '../model/departures';
import { isDrawn, directionLine, type Direction } from '../model/routes';

/*
 * The cards that stand in for one another over the map — the route list, a
 * hotspot's card, the trip opened from either — and what each does to the
 * others: the decisions, as plain functions both apps call, so the rules are
 * written once and tested (tests/unit/card-stack-test.mjs).
 */

/** Several things under one tap — routes, hotspots or both: the route list asks which. */
export function isChoosing(routes: readonly unknown[], hotspots: readonly unknown[]): boolean {
  return routes.length + hotspots.length > 1;
}

/**
 * What a trip's ‹ goes back to: the card it was picked from, kept behind it —
 * the route list, a hotspot's card (`behind`); opened with nothing behind it,
 * its route listed with those sharing its head or its tail, its way round,
 * when another of them is drawn that way (`fan`); else nothing, and no ‹.
 */
export function tripBack(
  trip: Direction | null,
  directions: readonly Direction[],
  behind: boolean,
): 'behind' | 'fan' | null {
  if (behind) return 'behind';
  if (!trip) return null;
  const sameWay = sharingAnEnd(directions, trip).filter(
    (v) => v.reversed === trip.reversed && isDrawn(v),
  );
  return sameWay.length > 1 ? 'fan' : null;
}

/**
 * The height the sheets share: a pick and ‹ keep it as it was; with nothing
 * open it goes back to Low, where every sheet opens (the owner's rule).
 */
export function sharedSnap(snap: Snap, anyOpen: boolean): Snap {
  return anyOpen ? snap : 'low';
}

/**
 * A trip stepped behind a place's card when its name on the map was tapped:
 * it stays there, for the card's ‹, only while that card is open and no trip
 * is — anything else opening or closing lets it go.
 */
export function tripBehindHolds(tripOpen: boolean, placeOpen: boolean): boolean {
  return placeOpen && !tripOpen;
}

/** The cards that are up: a trip, a place's card, the route list, and a trip stepped behind a place's card. */
export interface CardsUp {
  trip: boolean;
  place: boolean;
  list: boolean;
  tripBehind: boolean;
}

/** What the browser's Back does to the cards that are up. */
export type BackMove = 'trip-to-behind' | 'place-to-trip' | 'close-place' | 'close-all';

/**
 * What the browser's Back does: the ‹ of the card on show where a card is kept behind it, its ✕
 * where none is. A trip steps back to the place's card or the list behind it; a place's card, to
 * the trip it stood in front of. Never the trip's ‹ that lists its route with those sharing an
 * end: Back takes a card away and opens none, so enough Backs always leave the page. Null with no
 * card up: Back is the browser's own.
 */
export function backMove(up: CardsUp): BackMove | null {
  if (up.trip) return up.place || up.list ? 'trip-to-behind' : 'close-all';
  if (up.place) return up.tripBehind ? 'place-to-trip' : 'close-place';
  return up.list ? 'close-all' : null;
}

/**
 * A HintuanCard's Selected row let go: it stays let go only while that box is
 * still the one the card is on.
 */
export function letGoHolds(letGoId: string | null, selectedId: string | null): boolean {
  return letGoId !== null && letGoId === selectedId;
}

/** What a card frames: routes whole, or a place kept in view. */
export type Framed = { lines: readonly (readonly LngLat[])[] } | { at: LngLat } | null;

/**
 * What the card on show frames as the sheet settles at another height
 * (useHeightOverview): an open trip, its route, or the ride picked on it from
 * a start to an end (`ride`), so the overview takes in the new start and end;
 * a place's card, the routes of the RouteCard picked on it, else the place;
 * the route list, the picked card's routes, else what it lights (`lit`);
 * nothing open, nothing. `picked` is the picked card's directions, null with
 * no card picked.
 */
export function framedBy(
  trip: Direction | null,
  ride: readonly LngLat[] | null,
  placeAt: LngLat | null,
  choosing: boolean,
  picked: readonly Direction[] | null,
  lit: readonly Direction[],
): Framed {
  const card = picked && { lines: picked.map(directionLine) };
  if (trip) return { lines: [ride ?? directionLine(trip)] };
  if (placeAt) return card ?? { at: placeAt };
  if (choosing) return card ?? { lines: lit.map(directionLine) };
  return null;
}
