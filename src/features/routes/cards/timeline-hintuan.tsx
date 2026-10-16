import { useRef } from 'react';

import { Button } from '@/design-system/primitives/button';
import { CloseIcon } from '@/shared/ui/route-icons';

import { BUTTON_FILL } from './livery-card';
import { RideMark } from './ride-mark';
import {
  RouteTripLineDetailPill,
  type RouteTripLineDetailPillContent,
} from './route-trip-line-detail-pill';
import { TimelineDot } from './timeline-dot';
import type { RideMarkKind, RowRole } from './timeline-row-role';
import {
  TimelineStick,
  type TimelineStickConnection,
  type TimelineStickVariant,
} from './timeline-stick';
import type { Livery } from '../model/liveries';

/**
 * A hintuan row open, or folded away: its one grid row runs from nothing to
 * its height (1fr), and back. `visibility` flips at the end of the fold, so
 * the row stays in sight while it closes, then leaves the words and the
 * screen reader. Folded and never opened, the row is its <li> alone: with
 * nothing in it its 0fr row is as tall as with its clipped inside, nothing,
 * and it keeps these classes, so the first opening runs the same transition
 * from the same 0fr.
 */
const ROW_SHOWN = 'visible grid-rows-[1fr] duration-gentle ease-enter';
const ROW_FOLDED = 'invisible grid-rows-[0fr] duration-base ease-exit';

interface TimelineHintuanProps {
  id: string;
  rail: string;
  /** ROW_PRESSED's classes for the card's livery. */
  pressed: string;
  label: string;
  isShown: boolean;
  /** Whether its inside is drawn: shown, or folded after it has been opened (useTimelineFolds' everOpened). */
  isDrawn: boolean;
  selected: boolean;
  /** What its pill says (rowRole); null, no pill. */
  pill: RouteTripLineDetailPillContent | null;
  livery: Livery;
  /** On the rail, or its dot alone: a start alone (railPiece). */
  connection: TimelineStickConnection;
  /**
   * Its piece of the rail (railPiece): MiddleTop where the rail starts again
   * after a break, MiddleBottom where it breaks, Middle between. It breaks
   * where a ride starts and where it ends, and round a start alone.
   */
  piece: TimelineStickVariant;
  /** The ride's start (S) or end (E), before its name; null for any other row. */
  mark: RideMarkKind | null;
  /** The button under the row: Set as start under the end, × Remove as start under the start. */
  action: RowRole['action'];
  onPick: (id: string) => void;
}

/**
 * Figma's TimelineHintuan: a hintuan on the way, its dot on the rail; the
 * whole row is its button. Selected (State=Selected), its name is ExtraBold
 * and its pill sits 8 after it, 16 in from the card's edge. Its name is 10
 * above and below, the row 44 tall, and a button under it 16 below the name
 * and 10 above the next row (Timeline set, 3716:1894, over the trip frame's
 * spacing, 3778:3183).
 */
export function TimelineHintuan({
  id,
  rail,
  pressed,
  label,
  isShown,
  isDrawn,
  selected,
  pill,
  livery,
  connection,
  piece,
  mark,
  action,
  onPick,
}: TimelineHintuanProps) {
  // × Remove as start takes its own button away: the keyboard's focus goes
  // to the row it was under, not to the page. Set as start keeps its place,
  // the button under the row turning to × Remove as start.
  const pickButton = useRef<HTMLButtonElement>(null);
  return (
    <li
      data-testid="trip-hintuan"
      data-hintuan={id}
      data-state={selected ? 'selected' : 'rest'}
      className={
        'grid transition-[grid-template-rows,visibility] motion-reduce:transition-none ' +
        (isShown ? ROW_SHOWN : ROW_FOLDED)
      }
    >
      {/* Clipped, not squeezed: the row keeps its height inside, and shows from the top. */}
      {isDrawn && (
        <div className="min-h-0 overflow-hidden">
          <button
            type="button"
            ref={pickButton}
            data-testid="trip-hintuan-pick"
            aria-pressed={selected}
            onClick={() => onPick(id)}
            className={'flex w-full items-start px-4 text-left ' + pressed}
          >
            <TimelineStick
              variant={piece}
              connection={connection}
              rail={rail}
              dot={<TimelineDot rail={rail} selected={selected} />}
            />
            {mark && <RideMark mark={mark} livery={livery} isSmall />}
            <span
              className={
                'flex min-w-0 flex-1 items-center gap-2 py-2.5 ' + (mark ? 'pl-1.5' : 'pl-3')
              }
            >
              <span
                className={
                  'min-w-0 flex-1 text-base/6 ' + (selected ? 'font-extrabold' : 'font-medium')
                }
              >
                {label}
              </span>
              {/* After the name, so the name is still the row's first words; the circled letter is for the eye. */}
              {mark && <span className="sr-only">{mark === 'start' ? ', start' : ', end'}</span>}
              {pill && <RouteTripLineDetailPill livery={livery} {...pill} />}
            </span>
          </button>
          {/* Under the row, its own button (Figma Choosing and Variant3,
              4137:9887 and 4148:12161): a sibling of the row's, never inside it.
              The rail runs on beside it where it runs on below the row. */}
          {action && (
            <div className="flex px-4">
              <TimelineStick
                variant="disclosure"
                connection={
                  connection === 'connected' && piece !== 'middleBottom'
                    ? 'connected'
                    : 'disconnected'
                }
                rail={rail}
              />
              <span className="pt-1.5 pb-2.5 pl-3">
                <Button
                  variant="primary"
                  size="small"
                  fill={BUTTON_FILL[livery]}
                  label={action.label}
                  firstIcon={action.isRemove ? <CloseIcon /> : undefined}
                  onClick={() => {
                    if (action.isRemove) pickButton.current?.focus();
                    action.onTap();
                  }}
                />
              </span>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
