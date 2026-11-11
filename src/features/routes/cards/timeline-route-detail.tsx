import { useState, type ReactNode } from 'react';

import { ROW_PRESSED, TIMELINE_SURFACE } from './livery-card';
import { RouteStopsCard } from './route-stops-card';
import { TimelineBottomEndRoute } from './timeline-bottom-end-route';
import { TimelineHintuan } from './timeline-hintuan';
import { endRowPill, originMark, rowRole, type EndRow } from './timeline-row-role';
import { timelineRowStates } from './timeline-row-states';
import { TimelineTop } from './timeline-top';
import type { Livery } from '../model/liveries';
import { rideRows } from '../model/ride-rows';

export interface TimelineRouteDetailProps {
  livery: Livery;
  /** Figma's Route on TimelineTop: the place the trip leaves from. */
  routeOrigin: string;
  /** Figma's TimelineHintuan rows: every hintuan on the way, in the order the jeep reaches them. */
  hintuans: readonly { id: string; label: string }[];
  /** The hintuan picked, by its row's id — Figma's Timeline State=Selected — or null: where the ride ends (E). */
  picked: string | null;
  /**
   * The hintuan made the ride's start (S) by Set as start, by its row's id,
   * or null: the ride leaves from the origin (Figma 4137:9886).
   */
  start?: string | null;
  /** On a train, the start station's code, for its pill (Variant3, and Variant4 beside the end's). */
  startCode?: string | null;
  /** On a train, the origin's and the destination's station codes, in their slots (T1). */
  originCode?: string | null;
  destinationCode?: string | null;
  /** Set as start, under the picked row while no start is picked. Without it, no button. */
  onSetStart?: () => void;
  /** × Remove as start, under the start's row. Without it, no button. */
  onRemoveStart?: () => void;
  /** A hintuan's row was tapped: pick it, or, picked, let it go. */
  onPick: (id: string) => void;
  /**
   * The pesos of the ride between the picks, for the end's pill (the start's
   * says its code alone, though Variant4 draws the pesos on both): the fare
   * the fare tile shows, Regular or Discounted. Omitted when
   * unpriced, and no pill.
   */
  pickedPesos?: string;
  /**
   * On a train, the picked station's code, YL06, before the pesos in its
   * pill, in two halves (RouteTripLineDetailPill's Two). Null for a jeepney's
   * hintuan, the ferry's, and a station the table does not know: the pesos alone.
   */
  pickedCode?: string | null;
  /** The origin's row (`from`) or the destination's (`to`) was tapped: that end shown, the whole ride again, or with a start the ride's end. */
  onEnd: (end: EndRow) => void;
  /**
   * The origin (`from`) or the destination (`to`), picked from its row: its
   * dot the Selected one, as a picked hintuan's; or null. One pick at a
   * time: the caller keeps this and `picked` apart (useRideTo does), since
   * both at once would draw two picked dots.
   */
  endPicked: EndRow | null;
  /** Figma's Route on TimelineBottomEndRoute: the place the trip goes to. */
  routeDirection: string;
  /**
   * A loop's trip: its origin and its destination are one place, the tip, and
   * a ride only goes forward round it, so an end above the start wraps (the
   * rail breaks twice) and either end row is the same end.
   */
  isLoop?: boolean;
  /**
   * Above the first row, on the card's colour: what the trip rides (RouteStopsCardHeader).
   */
  header?: ReactNode;
}

/**
 * A trip's stops on RouteStopsCard, in the trip's livery (RouteStopsCard, 4681:29138): every stop
 * from the origin (TimelineTop) to the place it goes to (TimelineBottomEndRoute), each a
 * RouteStopsTimeline row (4611:10957), Start's S and End's E in their slots.
 *
 * It opens folded, the card cut at 120: the first stop and the top of the next, "View more" on its
 * foot; open, every stop, "View less". A route with no hintuans never folds (T3). A pick
 * opens it, so the picked stop is in sight; folding again is the rider's (T2). Folded, the stops
 * under the cut are out of a keyboard's reach too.
 *
 * A stop's row picks it as where the ride ends, and the origin's and the destination's rows show
 * that end, or with a start picked make it the ride's end; a second tap lets it go. Picked, the
 * rows outside the ride stand alone, Unselected; its ends are Selected, the rows between on the
 * rail (T4). A start alone is no ride yet: every row stands alone until an end is picked. A picked
 * stop's pill holds the pesos the fare tile shows, Regular or Discounted as it is turned; on a
 * train the ends carry their station codes, and a picked station its code in its pill (T1).
 */
export function TimelineRouteDetail({
  livery,
  routeOrigin,
  hintuans,
  picked,
  onPick,
  start = null,
  startCode = null,
  originCode = null,
  destinationCode = null,
  onSetStart,
  onRemoveStart,
  pickedPesos,
  pickedCode = null,
  onEnd,
  endPicked,
  routeDirection,
  isLoop = false,
  header,
}: TimelineRouteDetailProps) {
  const canFold = hintuans.length > 0;
  // Every pick opens the stops, so the picked one is in sight (T2): one made as the trip opens,
  // from a pin on the map, one made after, and one in another's place.
  const hasPick = start !== null || picked !== null || endPicked !== null;
  const picks = `${start}|${picked}|${endPicked}`;
  const [isMaximized, setIsMaximized] = useState(hasPick);
  const [lastPicks, setLastPicks] = useState(picks);
  if (lastPicks !== picks) {
    setLastPicks(picks);
    if (hasPick) setIsMaximized(true);
  }
  const isFolded = canFold && !isMaximized;
  const rail = TIMELINE_SURFACE[livery];
  const pressed = ROW_PRESSED[livery];
  const isStartAlone = start !== null && picked === null && endPicked === null;
  const ride = rideRows(hintuans, start, picked, endPicked, isLoop);
  const states = timelineRowStates(hintuans.length, ride, isStartAlone);
  const endPill = endRowPill(start, pickedCode, pickedPesos);

  return (
    <RouteStopsCard
      livery={livery}
      header={header}
      isMaximized={!isFolded}
      onToggleStops={canFold ? () => setIsMaximized((m) => !m) : undefined}
    >
      <ol className="flex w-full flex-col">
        <TimelineTop
          livery={livery}
          rail={rail}
          pressed={pressed}
          routeOrigin={routeOrigin}
          mark={originMark(start, endPicked)}
          pill={endPicked === 'from' ? endPill : null}
          code={endPicked === 'from' && endPill ? null : originCode}
          state={states[0] ?? 'rest'}
          selected={endPicked === 'from'}
          // A loop's two ends are the tip: with a start picked, either is the ride's end.
          onTap={() => onEnd(isLoop && start !== null ? 'to' : 'from')}
        />
        {hintuans.map((h, i) => {
          const isStart = h.id === start;
          const isEnd = h.id === picked;
          const { mark, pill, action } = rowRole({
            isStart,
            isEnd,
            hasStart: start !== null,
            startCode,
            pickedCode,
            pickedPesos,
            onSetStart,
            onRemoveStart,
          });
          return (
            <TimelineHintuan
              key={i + ':' + h.id}
              id={h.id}
              rail={rail}
              pressed={pressed}
              label={h.label}
              selected={isStart || isEnd}
              mark={mark}
              pill={pill}
              livery={livery}
              state={states[i + 1] ?? 'rest'}
              action={action}
              isFolded={isFolded && i > 0}
              isActionFolded={isFolded}
              onPick={onPick}
            />
          );
        })}
        <TimelineBottomEndRoute
          livery={livery}
          rail={rail}
          pressed={pressed}
          routeDirection={routeDirection}
          isEnd={picked === null && (start === null || endPicked === 'to')}
          pill={endPicked === 'to' ? endPill : null}
          code={endPicked === 'to' && endPill ? null : destinationCode}
          state={states[hintuans.length + 1] ?? 'rest'}
          isFolded={isFolded}
          selected={endPicked === 'to'}
          onTap={() => onEnd('to')}
        />
      </ol>
    </RouteStopsCard>
  );
}
