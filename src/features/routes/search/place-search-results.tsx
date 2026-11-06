import { cn } from '@/shared/utils/cn';
import { kmLabel } from '@/shared/utils/geo';

import { SearchRowContent } from './search-row-content';
import { rowKey, type SearchRow } from './search-rows';
import type { LandmarksState } from './use-landmarks';

interface PlaceSearchResultsProps {
  /** The listbox's id: the field's aria-controls names it. */
  id: string;
  rows: SearchRow[];
  /** The row the arrow keys are on, or -1. */
  activeIndex: number;
  /** Whether the landmarks are in, on their way or failed: a line under the rows says so. */
  landmarks: LandmarksState;
  onPick: (row: SearchRow) => void;
  onRetry: () => void;
}

/** The id of one result row, so the field can say which is active (aria-activedescendant). */
export const resultId = (listId: string, index: number) => `${listId}-${index}`;

/**
 * Place search's results under the field (.scratch/place-search, decisions 4 and 9): Para's
 * places first, each with what rides from it, then the OpenStreetMap landmarks, marked so, and
 * their credit while any is listed. A look for now, from the tokens; the owner designs it.
 */
export function PlaceSearchResults({
  id,
  rows,
  activeIndex,
  landmarks,
  onPick,
  onRetry,
}: PlaceSearchResultsProps) {
  const hasLandmarkRow = rows.some((row) => row.type === 'landmark');

  return (
    <div className="flex max-h-80 flex-col overflow-y-auto rounded-xl bg-surface py-1 shadow-large">
      {rows.length > 0 && (
        <ul id={id} role="listbox" aria-label="Places">
          {rows.map((row, index) => (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- a combobox's keys stay on its field (PlaceSearch's arrows and Enter); the row only takes the pointer
            <li
              key={rowKey(row)}
              id={resultId(id, index)}
              role="option"
              aria-selected={index === activeIndex}
              // The field keeps focus: a press here must not blur it before the pick lands.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onPick(row)}
              className={cn(
                'flex cursor-pointer items-baseline gap-3 px-4 py-2 text-content-primary',
                index === activeIndex && 'bg-surface-secondary',
              )}
            >
              <SearchRowContent row={row} />
              {row.match.distanceM !== null && (
                <span className="shrink-0 text-sm text-content-tertiary">
                  {kmLabel(row.match.distanceM)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {landmarks.status === 'loading' && (
        <p className="px-4 py-2 text-sm text-content-secondary">Looking through landmarks…</p>
      )}
      {landmarks.status === 'failed' && (
        <p className="flex items-baseline gap-2 px-4 py-2 text-sm text-content-secondary">
          Landmarks didn’t load. Para’s own places still show.
          <button
            type="button"
            onClick={onRetry}
            className="font-semibold text-content-primary underline"
          >
            Try again
          </button>
        </p>
      )}
      {hasLandmarkRow && landmarks.status === 'ready' && (
        <p className="px-4 pt-1 pb-2 text-xs text-content-tertiary">
          Landmarks{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {landmarks.landmarks.attribution}
          </a>
        </p>
      )}
    </div>
  );
}
