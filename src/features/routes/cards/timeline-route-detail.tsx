import { Fragment, type ReactNode } from 'react';

import {
  BLOB_PLACE,
  CARD_BLOB,
  CARD_SHADOW,
  CARD_SURFACE,
  CARD_TEXT,
  ROW_PRESSED,
  TIMELINE_SURFACE,
} from './livery-card';
import { TimelineBottomEndRoute } from './timeline-bottom-end-route';
import { TimelineDisclosure } from './timeline-disclosure';
import { TimelineHintuan } from './timeline-hintuan';
import { timelineRail } from './timeline-rail';
import { endRowPill, originMark, railPiece, rowRole, type EndRow } from './timeline-row-role';
import { TimelineTop } from './timeline-top';
import { useTimelineFolds } from './use-timeline-folds';
import type { Livery } from '../model/liveries';
import { rideRows } from '../model/ride';

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
  /** Set as start, under the picked row while no start is picked. Without it, no button. */
  onSetStart?: () => void;
  /** × Remove as start, under the start's row. Without it, no button. */
  onRemoveStart?: () => void;
  /** A hintuan's row was tapped: pick it, or, picked, let it go. */
  onPick: (id: string) => void;
  /**
   * The pesos of the ride between the picks, for the end's pill (the start's
   * says its code alone, though Variant4 draws the pesos on both): the fare
   * the tile under the card shows, Regular or Discounted. Omitted when
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
   * A train's trip: its fold reads "N more stations". A jeep's, and the
   * ferry's, read "N more hintuans".
   */
  isTrain?: boolean;
  /**
   * Above the first row, on the card's colour: a train's RouteTripDetailHeader,
   * its line and bound (Figma 3778:3183). Jeeps and the ferry have none.
   */
  header?: ReactNode;
}

/**
 * A trip's card, in the trip's livery, its route's (liveries.ts): a rail from
 * the origin (TimelineTop) down to the place it goes to (TimelineBottomEndRoute).
 *
 * The hintuans between fold into one row, "10 more hintuans"; opened, every one
 * of them shows alike — a place other routes end at, SM Fairview on the way to
 * Novaliches, is a hintuan like the rest — and "View less" folds them again. It
 * opens folded. A lone hintuan is shown as it is: a row saying "1 more hintuan"
 * would take its place only to hide it.
 *
 * The fold moves on the Motion tokens: the rows open over gentle, arriving
 * (ease-enter), and fold over base, leaving (ease-exit), each drawn from the
 * top as its height grows; the chevron turns over quick (ease-move). Folded,
 * the rows stay, invisible, so they can close in view — their insides drawn
 * only once the fold has been opened — and nothing moves for a phone set to
 * reduce motion. Height is layout, which the Motion note keeps to opacity and
 * transform: a fold is its one exception, since only the height can push the
 * destination down without measuring.
 *
 * The rows are Figma's Timeline set (3716:1894) — TimelineStick for the rail,
 * TimelineDot for the hotspots — drawn in red there; each livery takes its own
 * Card/<livery>/Timeline/surface.
 * The rail runs end to end with nothing picked. A ride picked, it breaks
 * where the ride starts and where it ends (TimelineStick MiddleBottom just
 * above the break, MiddleTop just below), running on along the rows before
 * the ride and after it (Figma Variant5, 4151:13619), the map leaving pale everything
 * outside the ride. A fold's row next to the ride carries no rail, open or
 * closed (Figma 4194:12562 and 4194:12702), so a fold shut by the ride leaves
 * the destination beyond it its dot alone. A start alone is no ride yet: its dot
 * stands alone, the rail broken round it, and the map and the tiles stay the
 * whole trip's until an end is picked (Variant3).
 *
 * A hintuan's row picks it (Figma Timeline State=Selected, 3769:2847): its
 * dot turns to a white ring round a centre in the card's rail colour
 * (TimelineDot), its name ExtraBold, and a pill beside it holds the pesos from
 * where the trip leaves to there, the same the fare tile under the card shows,
 * Regular or Discounted as it is turned, while a circle like its dot pops up on
 * the map where it is, the route left whole. Tapping it again lets it go, the
 * fare tile the whole ride's again; one at a time. A picked row is in the
 * ride, so it never folds away. The origin's and the destination's rows are
 * buttons too: a tap on either lets a hintuan go and picks that end, its dot
 * the Selected one, and a second lets it go. With no start, the ride is whole
 * again and the map glides to that end, so a rider can look along the route
 * from end to end, its name and the pesos as they are, the whole ride's being
 * the tile's. With a start, the end tapped is the ride's end and the start
 * stays: the destination's E, or the origin's E, the ride back to it, as an end
 * above the start.
 */
export function TimelineRouteDetail({
  livery,
  routeOrigin,
  hintuans,
  picked,
  onPick,
  start = null,
  startCode = null,
  onSetStart,
  onRemoveStart,
  pickedPesos,
  pickedCode = null,
  onEnd,
  endPicked,
  routeDirection,
  isTrain = false,
  header,
}: TimelineRouteDetailProps) {
  const { listRef, folds, isOpen, toggle, isShown, foldEndingAt, everOpened } = useTimelineFolds(
    hintuans,
    start,
    picked,
    endPicked,
  );
  const rail = TIMELINE_SURFACE[livery];
  // The rail runs along the ride and along the rows before it and after it,
  // broken where the ride starts and where it ends, and a fold's row next to
  // the ride carries none (timelineRail). The origin is -1, the destination
  // the row count (rideRows). No pick, it runs end to end. A start alone is
  // no ride yet, so it does not read as a ride: a ride of
  // its one row, its dot alone, until an end is picked.
  const isStartAlone = start !== null && picked === null && endPicked === null;
  const lone = isStartAlone ? hintuans.findIndex((h) => h.id === start) : -1;
  const ride =
    rideRows(hintuans, start, picked, endPicked) ??
    (lone >= 0 ? { first: lone, last: lone } : { first: -1, last: hintuans.length });
  const railOf = timelineRail(
    hintuans.map((h) => h.id),
    ride,
    folds,
    isOpen,
  );
  const endPill = endRowPill(start, pickedCode, pickedPesos);
  const pressed = ROW_PRESSED[livery];

  return (
    <div
      data-testid="trip"
      data-livery={livery}
      className={
        'relative isolate flex w-full flex-col overflow-clip rounded-2xl border-y-[0.6px] font-sn-pro ' +
        CARD_SURFACE[livery] +
        ' ' +
        CARD_TEXT[livery]
      }
    >
      <img
        src={CARD_BLOB[livery].src}
        alt=""
        aria-hidden
        className={BLOB_PLACE + ' ' + CARD_BLOB[livery].className}
      />
      {header}
      {/* The fold row keeps its place among the children whether open or not,
          so a keyboard's focus stays on it while the hintuans come and go. */}
      <ol ref={listRef} className="flex w-full flex-col">
        <TimelineTop
          livery={livery}
          rail={rail}
          pressed={pressed}
          routeOrigin={routeOrigin}
          mark={originMark(start, endPicked)}
          pill={endPicked === 'from' ? endPill : null}
          connection={railOf.originHasBelow ? 'connected' : 'disconnected'}
          selected={endPicked === 'from'}
          onTap={() => onEnd('from')}
        />
        {hintuans.map((h, i) => {
          const isStart = h.id === start;
          const isEnd = h.id === picked;
          const foldEnd = foldEndingAt(h.id);
          const isRowShown = isShown(h.id);
          const { connection, piece } = railPiece(railOf.rows[i]);
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
            <Fragment key={i + ':' + h.id}>
              <TimelineHintuan
                id={h.id}
                rail={rail}
                pressed={pressed}
                label={h.label}
                isShown={isRowShown}
                isDrawn={isRowShown || everOpened}
                selected={isStart || isEnd}
                mark={mark}
                pill={pill}
                livery={livery}
                connection={connection}
                piece={piece}
                action={action}
                onPick={onPick}
              />
              {foldEnd && (
                <TimelineDisclosure
                  part={foldEnd.part}
                  rail={rail}
                  pressed={pressed}
                  isOpen={isOpen(foldEnd.part)}
                  connection={railOf.foldHasRail(foldEnd.part) ? 'connected' : 'disconnected'}
                  count={foldEnd.rowIds.length}
                  isTrain={isTrain}
                  onToggle={() => toggle(foldEnd.part)}
                />
              )}
            </Fragment>
          );
        })}
        <TimelineBottomEndRoute
          livery={livery}
          rail={rail}
          pressed={pressed}
          routeDirection={routeDirection}
          isEnd={picked === null && (start === null || endPicked === 'to')}
          pill={endPicked === 'to' ? endPill : null}
          connection={railOf.destinationHasAbove ? 'connected' : 'disconnected'}
          selected={endPicked === 'to'}
          onTap={() => onEnd('to')}
        />
      </ol>
      {/* The rows' names are set in SN Pro Medium, a face nothing else on a
          card may use (no "Other routes", no signboards). Folded rows are not
          drawn until their fold first opens, so they would ask for the face
          only then and show their names in a stand-in font until it came
          (font-display: swap). One hidden name asks for it as the card opens. */}
      {!everOpened && folds.some((f) => !isOpen(f.part)) && (
        <span aria-hidden className="pointer-events-none invisible absolute font-medium">
          {hintuans[0]?.label}
        </span>
      )}
      <span
        aria-hidden
        className={'pointer-events-none absolute inset-0 rounded-[inherit] ' + CARD_SHADOW[livery]}
      />
    </div>
  );
}
