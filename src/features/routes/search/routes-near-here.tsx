import { useId } from 'react';

import { Button } from '@/design-system/primitives/button';
import { CloseIcon } from '@/shared/ui/route-icons';

import { LANDMARK_KIND_LABEL } from './search-rows';
import { NEAR_HERE_M, type HintuanNearHere } from '../model/landmark-search';
import type { Direction } from '../model/routes';
import { directionRowName } from '../model/routes';
import type { Landmark } from '../published/landmark-file-schema';

interface RoutesNearHereProps {
  landmark: Landmark;
  /** The hintuans near it, nearest first (routesNearHere). */
  near: HintuanNearHere[];
  /** The directions that stop at a hotspot, to name each hintuan's routes. */
  directionsAt: (hotspotId: string) => readonly Direction[];
  /** A hintuan chosen: opened as a tap on it does. */
  onPick: (hintuan: HintuanNearHere['hintuan']) => void;
  /**
   * "Go here" on a hintuan's row (ticket 07): the landmark made the trip's goal from there. Left
   * out, no button.
   */
  onGoHere?: (hintuan: HintuanNearHere['hintuan']) => void;
  onClose: () => void;
}

/** How many of a hintuan's routes are named before "and N more". */
const ROUTES_NAMED = 3;

/** A hintuan's routes in words: where each goes, the first few, then how many more. */
function routesInWords(directions: readonly Direction[]): string {
  const names = [...new Set(directions.map(directionRowName))];
  const named = names.slice(0, ROUTES_NAMED).join(', ');
  const more = names.length - ROUTES_NAMED;
  return more > 0 ? `${named} and ${more} more` : named;
}

/**
 * A landmark that is not a Para place (.scratch/place-search, decision 8): the hintuans within
 * about 500 m, straight-line, nearest first, each with where its routes go; or "No Para routes
 * near here yet". Given `onGoHere`, each row has "Go here" (ticket 07). A look for now, from the
 * tokens; the owner designs it.
 */
export function RoutesNearHere({
  landmark,
  near,
  directionsAt,
  onPick,
  onGoHere,
  onClose,
}: RoutesNearHereProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="flex max-h-80 flex-col rounded-xl bg-surface shadow-large"
    >
      <header className="flex items-start gap-2 px-4 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="truncate font-semibold text-content-primary">
            {landmark.name}
          </h2>
          <p className="text-sm text-content-secondary">
            {LANDMARK_KIND_LABEL[landmark.kind]} · Para routes within {NEAR_HERE_M} m, in a straight
            line
          </p>
        </div>
        <button
          type="button"
          aria-label="Close"
          title="Close"
          onClick={onClose}
          className="size-8 shrink-0 rounded-full p-1 text-content-secondary *:size-full"
        >
          <CloseIcon />
        </button>
      </header>
      {near.length === 0 ? (
        <p className="px-4 pb-3 text-sm text-content-secondary">No Para routes near here yet</p>
      ) : (
        <ul className="overflow-y-auto pb-1">
          {near.map(({ hintuan, distanceM }) => (
            <li key={hintuan.id} className="flex items-center gap-2 pr-4">
              <button
                type="button"
                onClick={() => onPick(hintuan)}
                className="flex min-w-0 flex-1 items-baseline gap-3 py-2 pl-4 text-left text-content-primary"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{hintuan.name}</span>
                  <span className="block truncate text-sm text-content-secondary">
                    {routesInWords(directionsAt(hintuan.id))}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-content-tertiary">
                  {Math.round(distanceM)} m
                </span>
              </button>
              {onGoHere && (
                <Button
                  variant="secondary"
                  size="small"
                  label="Go here"
                  aria-label={`Go here: ${hintuan.name}, for ${landmark.name}`}
                  onClick={() => onGoHere(hintuan)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
