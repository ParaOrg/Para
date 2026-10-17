import { useState, type ReactNode, type Ref } from 'react';

import { BottomSheet, type SheetHeight } from '@/shared/ui/bottom-sheet';

import { RouteCardHeader } from './route-card-header';
import { TimelineRouteDetail, type TimelineRouteDetailProps } from './timeline-route-detail';
import { FREE, type Fare } from './trip-fare';
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
   * Whether the tile shows the Discounted fare, and where a tap says so: the
   * app keeps one for every trip (useFareKind). Without them, the card keeps
   * its own, opening on Regular, as a story does.
   */
  discounted?: boolean;
  onDiscounted?: (discounted: boolean) => void;
  /** SWITCH: the same route the other way. */
  onSwitch: () => void;
  /** False when the route has no other way drawn; SWITCH then rests disabled. */
  switchable: boolean;
  /** Whether this trip is the route's way back, for the suites (SWITCH's `data-back`). */
  back: boolean;
  /** The word on SWITCH (switchWord): the way a tap leads to, Pabalik or Papunta, or a train's other bound. */
  way: string;
  /** ‹: back to what the trip was picked from — the list, a hotspot's card — or to its route with those sharing an end; null when there is none. */
  onBackToList: (() => void) | null;
  onClose: () => void;
  /** The dock the card sits in, for the map to glide clear of it. */
  dockRef?: Ref<HTMLDivElement>;
  /** Its height, shared with the list or card it was opened from (BottomSheet). */
  height?: SheetHeight;
  /**
   * Figma's "Other routes" under the tiles: the other routes out of where
   * this trip starts, each by where it goes. Empty or omitted, none is shown.
   */
  otherRoutes?: readonly OtherRoute[];
  /** A row tapped: that route's trip in this one's place. */
  onOtherRoute?: (id: string) => void;
  /**
   * Figma's "Signboard" (3919:11355): the boards this direction's jeeps show, as pictures, in their
   * order — addresses of SVG files the studio uploaded. Empty or omitted, none is shown.
   */
  signboards?: readonly string[];
  /** Under the tiles, a line's own fixed words (LINE_NOTES): the ferry's days and where to check for a suspension. */
  note?: string;
  /** Under the tiles: what only the studio shows — its facts and its Edit, Extend and Delete. */
  children?: ReactNode;
};

/**
 * One direction as a trip — Figma's TimelineRouteDetailCard (3778:3183): RouteCardHeader's
 * Variant2; under it a card in the trip's colour (useTripLivery), inset from the sides and rounded,
 * where a rail runs from the origin (TimelineTop) down to the place it goes to
 * (TimelineBottomEndRoute); under the card the direction's signboards as pictures (Figma's
 * Signboard, 3919:11355, uploaded in the studio) in their own strip (4051:5528); then two tiles,
 * the ride's Distance and its fare.
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
 * Under the tiles, "Other routes": a row per other route out of where the trip starts, each by
 * where it goes, as a RouteCard's rows are; a tap opens that route's trip in this one's place. With
 * none, there is no heading either.
 *
 * The card and its rail are TimelineRouteDetail's.
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
  isTrain,
  header,
  discounted: kept,
  onDiscounted,
  onSwitch,
  switchable,
  back,
  way,
  onBackToList,
  onClose,
  dockRef,
  height,
  otherRoutes = [],
  onOtherRoute,
  signboards = [],
  note,
  children,
}: Props) {
  const [own, setOwn] = useState(false);
  const discounted = kept ?? own;
  const setDiscounted = (d: boolean) => (onDiscounted ? onDiscounted(d) : setOwn(d));
  // Each tap turns ↻ round once more: counted, so the next tap turns it again rather than back. It
  // turns over `turn`, gentle at 6/10 as fast.
  const [turns, setTurns] = useState(0);
  // An end picked: the tiles read the ride between it and the start, a hintuan's row or, with a
  // start, an end's. A start alone is no ride yet, the whole trip's shown.
  const hasRide = picked !== null || (start !== null && endPicked !== null);
  const shown = hasRide && pickedFare ? pickedFare : fare;
  const shownMetres = hasRide && pickedMetres !== undefined ? pickedMetres : metres;
  return (
    <BottomSheet
      ref={dockRef}
      height={height}
      label={`${routeOrigin} → ${routeDirection}`}
      testId="card"
      onClose={onClose}
      header={
        <RouteCardHeader
          onBackToList={onBackToList}
          onSwitch={onSwitch}
          switchable={switchable}
          back={back}
          way={way}
          onClose={onClose}
        />
      }
    >
      {/* Under the header, whose 12 below is the gap (Figma 3778:3183). */}
      <div className="w-full px-3">
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
          isTrain={isTrain}
          header={header}
        />
      </div>
      {signboards.length > 0 && <TripSignboards signboards={signboards} />}
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
      {note && (
        <p
          data-testid="trip-note"
          className="w-full px-3 pb-4 font-sn-pro text-sm/5 text-content-tertiary"
        >
          {note}
        </p>
      )}
      {otherRoutes.length > 0 && <TripOtherRoutes routes={otherRoutes} onRoute={onOtherRoute} />}
      {children}
    </BottomSheet>
  );
}
