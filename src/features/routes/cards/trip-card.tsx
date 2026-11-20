import type { ReactNode, Ref } from 'react';

import type { SheetHeight } from '@/shared/ui/bottom-sheet';

import { ridePillOf } from './ride-pill-of';
import { TimelineRouteDetailCard } from './timeline-route-detail-card';
import { fareFor, pickedFareFor, publishedSignboard, tripFacts } from './trip-facts';
import { TripRidePills } from './trip-ride-pills';
import { useFareKind } from './use-fare-kind';
import { otherRoutesFrom, switchWord, wayWord } from '../model/departures';
import { liveryOf, type Livery } from '../model/liveries';
import { stationCode } from '../model/rail-codes';
import { LINE_NOTES, LOOP_WORD, type Direction } from '../model/routes';
import { directionRowParts } from '../model/row-name';
import type { Timeline } from '../model/timeline';

/**
 * The chosen direction as Figma's trip card (TimelineRouteDetailCard), from what the map file knows
 * (tripFacts): its ends and via, the whole ride's length and pesos, the hintuans on the way, and the
 * colour it opened in (useTripLivery), kept through PAPUNTA. A picked hintuan's pill prices the ride
 * from the start to there, as the fare tile then does. The studio shows what an editor needs at the
 * foot (`extras`). No link to a trip: the address does not follow the card.
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
  walk = null,
  onDrawOtherWay,
}: {
  direction: Direction;
  directions: readonly Direction[];
  timeline: Timeline;
  /** The colour it opened in, kept through PAPUNTA; its line wears it too. */
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
  /** A row behind "View N more routes" tapped: that direction's trip in this one's place. Without it, no rows. */
  onOtherRoute?: (direction: Direction) => void;
  /** Where a signboard's file is read: beside the published map, or the studio's bucket. */
  signboardUrl?: (name: string) => string;
  /** At the foot, the studio's alone: its facts and its Edit, Extend and Delete. */
  extras?: ReactNode;
  /** The walk from the ride's end to the landmark "Go here" was for (ticket 07), or null. */
  walk?: string | null;
  /** The studio's: with the other way not drawn, PAPUNTA starts drawing it, not resting disabled. */
  onDrawOtherWay?: () => void;
}) {
  const trip = tripFacts(direction, directions, timeline);
  const { isLoop: loop, from, to, line, sibling, metres } = trip;
  const ride = ridePillOf(direction);
  const canDrawOtherWay = trip.isOtherWayUndrawn && !!onDrawOtherWay;
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
      via={trip.via}
      originCode={line && stationCode(line, from)}
      destinationCode={line && stationCode(line, to)}
      isLoop={loop}
      label={loop ? `${direction.name ?? from} (${LOOP_WORD})` : undefined}
      switchable={trip.isSwitchable || canDrawOtherWay}
      back={direction.reversed}
      way={loop ? null : wayWord(direction.reversed, [direction])}
      wayTo={loop ? null : switchWord(direction.reversed, [direction])}
      onSwitch={() => {
        if (sibling && trip.isSwitchable) onSwitch(sibling);
        else if (canDrawOtherWay) onDrawOtherWay?.();
      }}
      onBackToList={onBackToList}
      onClose={onClose}
      ridePills={ride && <TripRidePills {...ride} livery={livery} />}
      signboards={(direction.signboards ?? []).map(signboardUrl)}
      note={LINE_NOTES[direction.route?.routeCode ?? '']}
      walk={walk}
      otherRoutes={others.map((v) => ({ id: v.id, ...directionRowParts(v), livery: liveryOf(v) }))}
      onOtherRoute={(id) => {
        const v = others.find((o) => o.id === id);
        if (v) onOtherRoute?.(v);
      }}
    >
      {extras}
    </TimelineRouteDetailCard>
  );
}
