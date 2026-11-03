import { cn } from '@/shared/utils/cn';

import { Skeleton } from '../common/skeleton';

/** How many cards stand in for the list: about a screen of them. */
const CARD_COUNT = 4;
const CARDS = Array.from({ length: CARD_COUNT }, (_, index) => `card-${index}`);

interface HistorySkeletonProps {
  /** False for the first moments of the wait: nothing shows, so a quick load does not flash. */
  isShown: boolean;
}

/**
 * History's list while the account's uploads load and nothing is listed yet: cards in the shape
 * of HistoryCard (its picture, a title, a line of detail), in its sizes and gaps, where the list
 * comes. A screen reader hears that the rides are loading.
 */
export function HistorySkeleton({ isShown }: HistorySkeletonProps) {
  return (
    <>
      <p role="status" className="sr-only">
        Loading your rides
      </p>
      <ul aria-hidden className="flex flex-col gap-3" data-history-skeleton>
        {CARDS.map((key) => (
          // HistoryCard's height with its usual lines (Figma 4518:24588), without the room its
          // list item keeps for the shadow.
          <li
            key={key}
            className={cn('flex h-30 rounded-2xl bg-surface shadow-sm', !isShown && 'invisible')}
          >
            <Skeleton isShown={isShown} className="w-22.75 shrink-0 rounded-l-xl" />
            <span className="flex min-w-0 flex-1 flex-col gap-3 p-3">
              <span className="flex h-6 items-center">
                <Skeleton isShown={isShown} className="h-4 w-3/4 rounded-full" />
              </span>
              <span className="flex flex-col gap-2">
                <span className="flex h-5 items-center">
                  <Skeleton isShown={isShown} className="h-3.5 w-1/2 rounded-full" />
                </span>
                <span className="flex h-5 items-center">
                  <Skeleton isShown={isShown} className="h-3.5 w-1/3 rounded-full" />
                </span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
