import { useState, type ReactNode, type Ref } from 'react';

import { BottomSheet, type SheetHeight } from '@/shared/ui/bottom-sheet';

import { RouteListController } from './route-list-controller';
import { TimelineRouteDetail, type TimelineRouteDetailProps } from './timeline-route-detail';
import { TripEndsCard } from './trip-ends-card';
import { FREE, type Fare } from './trip-fare';
import { TripNotes } from './trip-notes';
import { TripOtherRoutes, type OtherRoute } from './trip-other-routes';
import { TripSignboards } from './trip-signboards';
import { TripTiles } from './trip-tiles';

type Props = Omit<TimelineRouteDetailProps, 'pickedPesos'> & {
  /** Figma's Distance tile: the whole ride's length, in metres; written `12.8km`. */
  metres: number;
  /** …and the ride between the picks, which the tile shows once an end is picked, as the fare tile does. */
  pickedMetres?: number;
  /** The fare tile's pesos for the whole ride, or FREE. Omitted when unpriced, and the tile with it. */
  fare?: Fare;
  /** …and for the ride between the picks, which the tile shows once an end is picked. */
  pickedFare?: Fare;
  /**
   * Whether the tile shows the Discounted fare, and where a tap says so: the app keeps one for every
   * trip (useFareKind). Without them, the card keeps its own, opening on Regular, as a story does.
   */
  discounted?: boolean;
  onDiscounted?: (discounted: boolean) => void;
  onSwitch: () => void; // PAPUNTA and ⇅: the same route the other way, unless not `switchable`.
  switchable: boolean;
  back: boolean; // The way back, for the suites (PAPUNTA's `data-back`).
  /** PAPUNTA's word (wayWord), the way showing, and ⇅'s name (switchWord), the way a tap leads to. Null on a loop. */
  way: string | null;
  wayTo: string | null;
  /** The sheet's name for a screen reader, where `origin → destination` does not say it (a loop's). */
  label?: string;
  /** ‹: back to what the trip was picked from — the list, a hotspot's card — or to its route with those sharing an end; null when there is none, and ✕ stands there. */
  onBackToList: (() => void) | null;
  onClose: () => void;
  /** The dock the card sits in, for the map to glide clear of it. */
  dockRef?: Ref<HTMLDivElement>;
  /** Its height, shared with the list or card it was opened from (BottomSheet). */
  height?: SheetHeight;
  /** "Other routes" under the stops, out of where this trip starts. Empty or omitted, none. */
  otherRoutes?: readonly OtherRoute[];
  /** A row tapped: that route's trip in this one's place. */
  onOtherRoute?: (id: string) => void;
  /** The direction's signboards (4680:25123): SVG files the studio uploaded, in order. None, no card. */
  signboards?: readonly string[];
  /** Under the stops, a line's own fixed words (LINE_NOTES): the ferry's days and where to check for a suspension. */
  note?: string;
  /**
   * Under the stops, first: the walk from the ride's end to a landmark the commuter is going to
   * (ticket 07), "About 300 m to SM North EDSA, in a straight line".
   */
  walk?: string | null;
  /** Last: what only the studio shows — its facts and its Edit, Extend and Delete. */
  children?: ReactNode;
};

/**
 * One direction as a trip (RouteTripDetail, 4681:32026), with the Controller's bar: its ends
 * (TripEndsCard), the ride's Distance and fare tiles, its signboards, then its stops in the trip's
 * colour (useTripLivery) on RouteStopsCard.
 *
 * The fare tile is a button: the pesos, and under them ↻ and which fare they are, Regular or
 * Discounted; a tap turns it to the other. With a hintuan picked it prices the ride from where the
 * trip leaves to there — the pick's pill the same pesos — and let go, the whole ride again. The
 * fare picked is kept for every trip after, and the next visit (useFareKind), so a rider does not
 * have to keep tapping. A first visit opens on Regular. The second fare reads "Discounted fare" on
 * purpose, though Figma's Default variant has a layer named "Student fare" (3807:5510). The
 * Distance tile follows the pick the same way, from where the trip leaves to there. Since a start
 * can be picked too, both tiles read the ride from the start to the end, once the end is picked: a
 * start alone is no ride yet. A route no fare rule prices has no Expected fare tile, and Distance
 * takes the row (Figma draws nothing for it; the owner keeps this default).
 *
 * Under the stops, "Other routes": the other routes out of where the trip starts (TripOtherRoutes);
 * a tap opens that one's trip in this one's place. With none, no heading either.
 */
export function TimelineRouteDetailCard({
  livery,
  metres,
  pickedMetres,
  fare,
  routeOrigin,
  hintuans,
  picked,
  start = null,
  startCode,
  onSetStart,
  onRemoveStart,
  onPick,
  pickedFare,
  pickedCode,
  onEnd,
  endPicked,
  routeDirection,
  originCode,
  destinationCode,
  isLoop,
  header,
  discounted: kept,
  onDiscounted,
  onSwitch,
  switchable,
  back,
  way,
  wayTo,
  label,
  onBackToList,
  onClose,
  dockRef,
  height,
  otherRoutes = [],
  onOtherRoute,
  signboards = [],
  note,
  walk,
  children,
}: Props) {
  const [own, setOwn] = useState(false);
  const discounted = kept ?? own;
  const setDiscounted = (d: boolean) => (onDiscounted ? onDiscounted(d) : setOwn(d));
  // Each tap turns ↻ round once more, counted, so the next tap turns it on rather than back.
  const [turns, setTurns] = useState(0);
  // An end picked: the tiles read the ride from the start to it. A start alone is no ride yet.
  const hasRide = picked !== null || (start !== null && endPicked !== null);
  const shown = hasRide && pickedFare ? pickedFare : fare;
  const shownMetres = hasRide && pickedMetres !== undefined ? pickedMetres : metres;
  return (
    <BottomSheet
      ref={dockRef}
      height={height}
      label={label ?? `${routeOrigin} → ${routeDirection}`}
      testId="card"
      onClose={onClose}
      header={null}
      footer={
        <RouteListController
          owner="card"
          way={way}
          wayTo={wayTo}
          isSwitchable={switchable}
          isBack={back}
          onSwitch={onSwitch}
          livery={livery}
          onBack={onBackToList}
          onClose={onClose}
        />
      }
    >
      {/* Cards 16 apart, 12 in, clear of the Controller: 78 at a phone's foot, 64 on top floating. */}
      <div className="flex w-full flex-col gap-4 px-3 pt-3 pb-24 sheet-floating:pt-19 sheet-floating:pb-6">
        <TripEndsCard
          routeOrigin={routeOrigin}
          routeDirection={routeDirection}
          way={wayTo}
          isSwitchable={switchable}
          onSwitch={onSwitch}
        />
        <TripTiles
          shown={shown}
          shownMetres={shownMetres}
          isDiscounted={discounted}
          turns={turns}
          onTurn={() => {
            setDiscounted(!discounted);
            setTurns((t) => t + 1);
          }}
        />
        {signboards.length > 0 && <TripSignboards signboards={signboards} />}
        <TimelineRouteDetail
          livery={livery}
          routeOrigin={routeOrigin}
          hintuans={hintuans}
          picked={picked}
          start={start}
          startCode={startCode}
          onSetStart={onSetStart}
          onRemoveStart={onRemoveStart}
          onPick={onPick}
          pickedPesos={
            pickedFare &&
            (pickedFare === FREE ? 'Free' : discounted ? pickedFare.discounted : pickedFare.regular)
          }
          pickedCode={pickedCode}
          onEnd={onEnd}
          endPicked={endPicked}
          routeDirection={routeDirection}
          originCode={originCode}
          destinationCode={destinationCode}
          isLoop={isLoop}
          header={header}
        />
      </div>
      <TripNotes walk={walk} note={note} />
      {otherRoutes.length > 0 && <TripOtherRoutes routes={otherRoutes} onRoute={onOtherRoute} />}
      {children}
    </BottomSheet>
  );
}
