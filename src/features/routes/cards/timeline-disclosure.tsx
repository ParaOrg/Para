import { ChevronDownIcon } from '@/shared/ui/route-icons';

import type { FoldPart } from './timeline-folds';
import { TimelineStick, type TimelineStickConnection } from './timeline-stick';

interface TimelineDisclosureProps {
  /** Which rows it folds: every hintuan, or those before or after a picked ride (timelineFolds). */
  part: FoldPart;
  rail: string;
  /** ROW_PRESSED's classes for the card's livery. */
  pressed: string;
  isOpen: boolean;
  /** Disconnected next to the ride, open or closed (timelineRail): no rail beside it. */
  connection: TimelineStickConnection;
  count: number;
  /** "N more stations" on a train, "N more hintuans" else. */
  isTrain: boolean;
  onToggle: () => void;
}

/**
 * Figma's TimelineDisclosure: the hintuans folded into one row, or, opened,
 * the row that folds them. The rail runs through it between rows on one side
 * of the ride (Figma 4151:13619); next to the ride its stretch is left
 * unfilled, as TimelineStick in 4194:12702 is. Its words are 10 above and
 * below, the row 40 tall, the chevron 6 before them (Timeline set, 3716:1894).
 */
export function TimelineDisclosure({
  part,
  rail,
  pressed,
  isOpen,
  connection,
  count,
  isTrain,
  onToggle,
}: TimelineDisclosureProps) {
  const foldWord = isTrain ? 'stations' : 'hintuans';
  return (
    <li>
      <button
        type="button"
        data-testid="trip-fold"
        aria-expanded={isOpen}
        data-part={part}
        onClick={onToggle}
        className={'flex w-full items-start px-4 text-left ' + pressed}
      >
        <TimelineStick variant="disclosure" connection={connection} rail={rail} />
        <span className="flex min-w-0 flex-1 items-center gap-1.5 py-2.5 pl-3 text-sm/5 font-normal whitespace-nowrap">
          {/* One chevron, turned: Figma's chevron-down, and its chevron-up opened. */}
          <span
            aria-hidden
            className={
              'size-5 shrink-0 transition-transform duration-quick ease-move *:size-full motion-reduce:transition-none ' +
              (isOpen ? 'rotate-180' : 'rotate-0')
            }
          >
            <ChevronDownIcon />
          </span>
          {isOpen ? 'View less' : `${count} more ${foldWord}`}
        </span>
      </button>
    </li>
  );
}
