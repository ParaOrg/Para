import { useId } from 'react';

import { TimelineBottomEndRoute } from './timeline-bottom-end-route';
import { TimelineHintuan } from './timeline-hintuan';
import { STOP_PRESSED, TIMELINE_HEADING, TIMELINE_RAIL } from './timeline-look';
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
  /** The hintuan made the ride's start (S) by Set as start, or null: from the origin (4137:9886). */
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
  /**
   * A hintuan's row tapped: pick it, or, picked, let it go. Given or omitted with `onEnd`: omitted,
   * no row is a control (picking is off); one alone would leave the end rows behaving apart.
   */
  onPick?: (id: string) => void;
  /**
   * The pesos of the ride between the picks, for the end's pill (the start's says its code alone,
   * though Variant4 draws them on both): the fare tile's, Regular or Discounted. Unpriced, no pill.
   */
  pickedPesos?: string;
  /**
   * On a train, the picked station's code, YL06, before the pesos in its pill, in two halves
   * (RouteTripLineDetailPill's Two). Null on the road, the ferry and unknown stations: pesos alone.
   */
  pickedCode?: string | null;
  /** The origin's row (`from`) or the destination's (`to`) was tapped: that end shown, the whole ride again, or with a start the ride's end. */
  onEnd?: (end: EndRow) => void;
  /**
   * The origin (`from`) or the destination (`to`), picked from its row: its dot the Selected one;
   * or null. One pick at a time: the caller keeps this and `picked` apart (useRideTo does).
   */
  endPicked: EndRow | null;
  /** Figma's Route on TimelineBottomEndRoute: the place the trip goes to. */
  routeDirection: string;
  /**
   * A loop's trip: its origin and destination are one place, the tip; a ride only goes forward round
   * it, so an end above the start wraps (the rail breaks twice) and either end row is the same end.
   */
  isLoop?: boolean;
}

/**
 * A trip's stops on the sheet's surface (RouteHintuans, 4796:29755), under TIMELINE_HEADING's
 * words, Bold 20/28, 16 in: every stop from the origin (TimelineTop) to where it goes
 * (TimelineBottomEndRoute), each a RouteStopsTimeline row on the trip's rail (TIMELINE_RAIL),
 * Start and End in their slots. Every stop shows: nothing folds.
 *
 * Where picking is on (TimelineRowTap), a stop's row picks it as the ride's end, and the origin's
 * and the destination's show that end, or with a start make it the ride's end; a second tap lets
 * go. Picked, the rows outside the ride stand alone, Unselected; its ends are Selected, the rows
 * between on the rail (T4). A start alone is no ride yet. A picked stop's pill holds the fare
 * tile's pesos; on a train the ends carry their codes, and a picked station its code (T1).
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
}: TimelineRouteDetailProps) {
  const rail = TIMELINE_RAIL[livery];
  const pressed = STOP_PRESSED;
  const isStartAlone = start !== null && picked === null && endPicked === null;
  const ride = rideRows(hintuans, start, picked, endPicked, isLoop);
  const states = timelineRowStates(hintuans.length, ride, isStartAlone);
  const endPill = endRowPill(start, pickedCode, pickedPesos);
  const heading = useId();

  return (
    <div data-testid="trip" data-livery={livery} className="flex w-full flex-col font-sn-pro">
      <h3 id={heading} className="px-4 text-xl/7 font-bold text-text-primary">
        {TIMELINE_HEADING[livery]}
      </h3>
      <ol aria-labelledby={heading} className="flex w-full flex-col">
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
          onTap={onEnd && (() => onEnd(isLoop && start !== null ? 'to' : 'from'))}
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
          selected={endPicked === 'to'}
          onTap={onEnd && (() => onEnd('to'))}
        />
      </ol>
    </div>
  );
}
