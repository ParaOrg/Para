import { useId, useState } from 'react';

import type { Timeline, TimelineRow } from '@/features/routes/model/timeline';

/** How many places show before View more: Figma's collapsed box holds three. */
const COLLAPSED_ROWS = 3;

type RowPlace = 'first' | 'middle' | 'last' | 'only';

interface RouteLineProps {
  /** What the line passes, by the rule the save will apply: its ends and the hintuans between. */
  timeline: Timeline;
}

/**
 * The sidebar's Route line (Figma 4300:20893, Component 14): the places the line passes, in the
 * order it was drawn, on a rail, the first and last ringed. Longer than three, it folds to the
 * first three under a fade, with View more; opened, View less folds it again.
 */
export function RouteLine({ timeline }: RouteLineProps) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const rows: TimelineRow[] = [
    ...(timeline.from ? [timeline.from] : []),
    ...timeline.between,
    ...(timeline.to ? [timeline.to] : []),
  ];
  if (rows.length === 0) return null;
  const canFold = rows.length > COLLAPSED_ROWS;
  const isFolded = canFold && !isOpen;

  return (
    <div className={'relative rounded-2xl bg-surface-tertiary' + (canFold ? ' mb-3' : '')}>
      <ol id={listId} className={'overflow-clip rounded-2xl' + (isFolded ? ' max-h-31' : '')}>
        {rows.map((row, i) => (
          // The index too: a first guess can put one place at both ends.
          <RouteLineRow key={`${i}-${row.id}`} row={row} place={rowPlace(i, rows.length)} />
        ))}
      </ol>
      {isFolded && (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-15.5 rounded-b-2xl bg-linear-to-b from-surface-tertiary/0 to-surface-tertiary"
        />
      )}
      {canFold && (
        <div className="absolute inset-x-0 -bottom-3 flex justify-center">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={listId}
            onClick={() => setIsOpen((open) => !open)}
            className="rounded-full bg-surface px-2.5 py-1 text-xs/4 font-medium text-content-secondary shadow-sm"
          >
            {isOpen ? 'View less' : 'View more'}
          </button>
        </div>
      )}
    </div>
  );
}

function rowPlace(index: number, count: number): RowPlace {
  if (count === 1) return 'only';
  if (index === 0) return 'first';
  if (index === count - 1) return 'last';
  return 'middle';
}

/** The rail's piece beside each row: it starts at the first dot and ends at the last. */
const RAIL = {
  first: 'mt-2.5 flex-1 items-start rounded-t-full',
  middle: 'flex-1 items-start pt-2.5',
  last: 'mb-2.5 flex-1 items-end rounded-b-full',
  only: 'my-2.5 items-center rounded-full',
} satisfies Record<RowPlace, string>;

interface RouteLineRowProps {
  row: TimelineRow;
  place: RowPlace;
}

/** One place on the Route line: its dot on the rail, ringed at either end, and its name. */
function RouteLineRow({ row, place }: RouteLineRowProps) {
  const isEnd = place !== 'middle';
  return (
    <li className="flex gap-2.5 px-3">
      <span aria-hidden className="flex flex-col self-stretch">
        <span className={'flex justify-center bg-content-disabled ' + RAIL[place]}>
          {isEnd ? (
            <span className="rounded-full bg-content-disabled p-0.5">
              <span className="relative block size-3 rounded-full bg-content-inverse">
                <span className="absolute top-1/2 left-1/2 size-2 -translate-1/2 rounded-full bg-content-disabled" />
              </span>
            </span>
          ) : (
            <span className="rounded-full bg-content-disabled p-1">
              <span className="block size-2 rounded-full bg-content-inverse" />
            </span>
          )}
        </span>
      </span>
      <span className="min-w-0 flex-1 py-2 text-sm/5 font-medium text-content-primary">
        {row.label}
      </span>
    </li>
  );
}
