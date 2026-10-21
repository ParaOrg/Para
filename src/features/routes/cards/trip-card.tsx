import { useState, type ReactNode, type Ref } from 'react';

import type { SheetHeight } from '@/shared/ui/bottom-sheet';
import { lineLength } from '@/shared/utils/geo';

import { RouteTripDetailHeader } from './route-trip-detail-header';
import { TimelineRouteDetailCard } from './timeline-route-detail-card';
import { FREE, type Fare, type Fares } from './trip-fare';
import { useFareKind } from './use-fare-kind';
import { otherDirection, otherRoutesFrom, switchWord, wayWord } from '../model/departures';
import { manilaDate, rideFare } from '../model/fares';
import { cardLiveries, type Livery } from '../model/liveries';
import { railBound } from '../model/rail-codes';
import { railFares } from '../model/rail-fares';
import {
  directionEnds,
  directionRowName,
  isDrawn,
  isFerry,
  isLoop,
  isRail,
  LINE_NOTES,
  LOOP_WORD,
  railLineOf,
  directionLine,
  type Direction,
} from '../model/routes';
import type { Timeline } from '../model/timeline';
import { vehicleOf } from '../model/vehicles';

/**
 * The trip's colour, one owner for it: decided as the trip opens — the RouteCard's it was picked
 * from, in the list or a hotspot's card, while that card stands behind it (a card of several routes
 * wears its first row's, liveries.ts), else its route's for the visit (drawn when first met, kept
 * after; a train's is its line's, never drawn) — and kept until it closes, through SWITCH and even
 * when a tap on its own line closes the list behind it: a card never changes colour while it is
 * open. Its line wears it too, so the page reads it, not the card. Settled while rendering, as
 * derived state is, so the card never shows a frame in the wrong colour.
 */
export function useTripLivery(
  open: Direction | null,
  worn: { id: string; livery: Livery } | null,
  wornBehind: boolean,
): Livery | null {
  const [tripWears, setTripWears] = useState<{ routeId: string; livery: Livery } | null>(null);
  let tripLivery = open && tripWears?.routeId === open.routeId ? tripWears.livery : null;
  if (open && !tripLivery) {
    tripLivery =
      (wornBehind && worn?.id === open.id ? worn.livery : undefined) ??
      cardLiveries([[open.routeId]], [railLineOf(open)])[0];
    setTripWears({ routeId: open.routeId, livery: tripLivery });
  } else if (!open && tripWears) {
    setTripWears(null);
  }
  return tripLivery;
}

/**
 * The chosen direction as Figma's trip card (TimelineRouteDetailCard), from what the map file
 * knows: its ends as the list names them, the whole ride's length and pesos, the hintuans on the
 * way, and its colour — the one its RouteCard wore, when it was picked from one, in the list or in
 * a hotspot's card; its route's, kept for the visit, when not. SWITCH turns it round, what it was
 * picked from staying behind it, and the card keeps the colour it opened in: turned round, it is
 * still the same card.
 *
 * A picked hintuan's pill prices the ride from the start to there, the same pesos the fare tile
 * then shows. The studio shows what an editor needs under the tiles (`extras`): the same card, with
 * more below it.
 *
 * No link to a trip: the address does not follow the card.
 */
export function TripCard({
  direction,
  directions,
  timeline,
  livery,
  onBackToList,
  onSwitch,
  onClose,
  picked,
  pickedMetres,
  pickedCode,
  start = null,
  startCode = null,
  onSetStart,
  onRemoveStart,
  onPick,
  onEnd,
  endPicked,
  dockRef,
  height,
  onOtherRoute,
  signboardUrl = publishedSignboard,
  extras,
}: {
  direction: Direction;
  directions: readonly Direction[];
  timeline: Timeline;
  /** The colour it opened in, kept through SWITCH; its line wears it too. */
  livery: Livery;
  onBackToList: (() => void) | null;
  onSwitch: (sibling: Direction) => void;
  onClose: () => void;
  /** The hintuan picked on the timeline (useRideTo), the ride's end, and how far the ride between the picks runs, when the line reaches them. */
  picked: string | null;
  pickedMetres: number | undefined;
  /** On a train, the picked station's sign code for its pill (useRideTo's `pickedCode`, the map's label's too); else null. */
  pickedCode: string | null;
  /** The hintuan made the ride's start (useRideTo's `startId`), or null: the ride leaves from the origin. */
  start?: string | null;
  /** On a train, the start station's sign code (useRideTo's `startCode`); else null. */
  startCode?: string | null;
  /** Set as start, under the picked hintuan's row (useRideTo's `setStart`). */
  onSetStart?: () => void;
  /** × Remove as start, under the start's row (useRideTo's `removeStart`). */
  onRemoveStart?: () => void;
  onPick: (id: string) => void;
  /** The origin's or the destination's row: that end on the map, the whole ride, or with a start the ride's end. */
  onEnd: (end: 'from' | 'to') => void;
  /** The end picked from its row (useRideTo's `endPicked`), or null. */
  endPicked: 'from' | 'to' | null;
  dockRef: Ref<HTMLDivElement>;
  /** Its sheet's height, shared with the list or card behind it (BottomSheet). */
  height: SheetHeight;
  /** A row of "Other routes" tapped: that direction's trip in this one's place. Without it, no rows. */
  onOtherRoute?: (direction: Direction) => void;
  /** Where a signboard's file is read: beside the published map, or the studio's bucket. */
  signboardUrl?: (name: string) => string;
  /** Under the tiles, the studio's alone: its facts and its Edit, Extend and Delete. */
  extras?: ReactNode;
}) {
  const loop = isLoop(direction);
  // A loop's trip leaves from its tip and comes back to it: both ends read the timeline's.
  const { from, to } =
    loop && timeline.from
      ? { from: timeline.from.label, to: (timeline.to ?? timeline.from).label }
      : directionEnds(direction);
  const line = railLineOf(direction);
  const vehicle = vehicleOf(direction);
  const sibling = otherDirection(directions, direction);
  // A loop has no way back, so no SWITCH at all.
  const switchable = !loop && !!sibling && isDrawn(sibling);
  // The whole ride, measured once on its full line — the index's figure, so
  // an overview drawn while the line is read never prices it: its Distance
  // and its Expected fare.
  const metres = direction.metres ?? lineLength(directionLine(direction));
  const [fareKind, setFareKind] = useFareKind();
  const others = onOtherRoute ? otherRoutesFrom(directions, direction) : [];
  return (
    <TimelineRouteDetailCard
      livery={livery}
      metres={metres}
      pickedMetres={pickedMetres}
      discounted={fareKind === 'discounted'}
      onDiscounted={(d) => setFareKind(d ? 'discounted' : 'regular')}
      fare={fareFor(direction, metres, timeline)}
      routeOrigin={from}
      hintuans={timeline.between}
      picked={picked}
      start={start}
      startCode={startCode}
      onSetStart={onSetStart}
      onRemoveStart={onRemoveStart}
      pickedFare={pickedFareFor(direction, pickedMetres, timeline, start, picked, endPicked)}
      pickedCode={pickedCode}
      onPick={onPick}
      onEnd={onEnd}
      endPicked={endPicked}
      dockRef={dockRef}
      height={height}
      routeDirection={to}
      isTrain={line !== null}
      isLoop={loop}
      label={loop ? `${direction.name ?? from} (${LOOP_WORD})` : undefined}
      header={
        vehicle && (
          <RouteTripDetailHeader
            vehicle={vehicle}
            // A train's bound alone: with none, its line alone, never Papunta.
            way={line ? railBound(direction) : wayWord(direction.reversed, [direction])}
            livery={livery}
            name={loop ? (direction.name ?? undefined) : undefined}
          />
        )
      }
      switchable={switchable}
      back={direction.reversed}
      way={loop ? null : switchWord(direction.reversed, [direction])}
      onSwitch={() => {
        if (sibling && switchable) onSwitch(sibling);
      }}
      onBackToList={onBackToList}
      onClose={onClose}
      signboards={(direction.signboards ?? []).map(signboardUrl)}
      note={LINE_NOTES[direction.route?.routeCode ?? '']}
      otherRoutes={others.map((v) => ({
        id: v.id,
        to: directionRowName(v),
      }))}
      onOtherRoute={(id) => {
        const v = others.find((o) => o.id === id);
        if (v) onOtherRoute?.(v);
      }}
    >
      {extras}
    </TimelineRouteDetailCard>
  );
}

/** A ride's pesos, regular and discounted, for the fare tile; undefined when no fare rule prices it. A train's are by its stations (railFares). */
function faresFor(mode: Parameters<typeof rideFare>[0], metres: number): Fares | undefined {
  const date = manilaDate();
  const regular = rideFare(mode, metres, date);
  const discounted = rideFare(mode, metres, date, 'discounted');
  return regular && discounted ? { regular, discounted } : undefined;
}

/** The whole ride's fare: a train's by its stations (railFares), the ferry's free, a jeep's by its metres. */
function fareFor(direction: Direction, metres: number, timeline: Timeline): Fare | undefined {
  if (isFerry(direction.route?.mode)) return FREE;
  if (isRail(direction.route?.mode))
    return railFares(direction.route.routeCode, timeline.from?.label, timeline.to?.label);
  return faresFor(direction.route?.mode, metres);
}

/**
 * The fare of the ride between the picks: a jeep's by the metres between them, a train's by the two
 * stations (railFares takes any pair, whichever way round), the ferry's free. A start left at the
 * origin is that end of the timeline, and an end row picked with a start (`endPicked`) is its own
 * end. No end picked, no ride to price: a start alone is no ride yet.
 */
function pickedFareFor(
  direction: Direction,
  pickedMetres: number | undefined,
  timeline: Timeline,
  start: string | null,
  picked: string | null,
  endPicked: 'from' | 'to' | null,
): Fare | undefined {
  // A start alone is no ride yet: nothing to price until its end is picked.
  const isEndRow = start !== null && endPicked !== null;
  if (picked === null && !isEndRow) return undefined;
  if (isFerry(direction.route?.mode)) return FREE;
  if (isRail(direction.route?.mode)) {
    const labelOf = (id: string | null, end: Timeline['from']) =>
      id === null ? end?.label : timeline.between.find((r) => r.id === id)?.label;
    const from = labelOf(start, timeline.from);
    const to = labelOf(picked, endPicked === 'from' ? timeline.from : timeline.to);
    return railFares(direction.route.routeCode, from, to);
  }
  return pickedMetres === undefined ? undefined : faresFor(direction.route?.mode, pickedMetres);
}

/** A board as the publish writes it, beside the map's own files. */
const publishedSignboard = (name: string) => `/data/signboards/${encodeURIComponent(name)}`;
