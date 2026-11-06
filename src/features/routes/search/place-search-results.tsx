import { cn } from '@/shared/utils/cn';
import { kmLabel } from '@/shared/utils/geo';

import type { PlaceMatch } from '../model/place-search';

interface PlaceSearchResultsProps {
  /** The listbox's id: the field's aria-controls names it. */
  id: string;
  matches: PlaceMatch[];
  /** The row the arrow keys are on, or -1. */
  activeIndex: number;
  onPick: (match: PlaceMatch) => void;
}

/** The id of one result row, so the field can say which is active (aria-activedescendant). */
export const resultId = (listId: string, index: number) => `${listId}-${index}`;

/**
 * Place search's results under the field (.scratch/place-search, step 1): each place by its
 * label, the name that matched when it is another, and how far it is when the commuter is
 * located. Shown only when something matched: PlaceSearch says when nothing did. A look for
 * now, from the tokens; the owner designs it.
 */
export function PlaceSearchResults({ id, matches, activeIndex, onPick }: PlaceSearchResultsProps) {
  return (
    <ul
      id={id}
      role="listbox"
      aria-label="Places"
      className="max-h-80 overflow-y-auto rounded-xl bg-surface py-1 shadow-large"
    >
      {matches.map((match, index) => (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- a combobox's keys stay on its field (PlaceSearch's arrows and Enter); the row only takes the pointer
        <li
          key={match.place.key}
          id={resultId(id, index)}
          role="option"
          aria-selected={index === activeIndex}
          // The field keeps focus: a press here must not blur it before the pick lands.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(match)}
          className={cn(
            'flex cursor-pointer items-baseline gap-3 px-4 py-2 text-content-primary',
            index === activeIndex && 'bg-surface-secondary',
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{match.place.label}</span>
            {match.matchedTerm !== match.place.label && (
              <span className="block truncate text-sm text-content-secondary">
                {match.matchedTerm}
              </span>
            )}
          </span>
          {match.distanceM !== null && (
            <span className="shrink-0 text-sm text-content-tertiary">
              {kmLabel(match.distanceM)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
