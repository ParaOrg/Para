import type { LngLat } from '@/shared/utils/geo';

import type { CheckSpot } from './check-spots';

interface CheckSpotListProps {
  spots: CheckSpot[];
  /** Whose line the drawing started from, as the words name it: "OSM’s". */
  lineOwner: string;
  /** Takes the camera to a place to check. */
  onLookAt: (at: LngLat) => void;
}

const spotWords = (spot: CheckSpot, lineOwner: string) =>
  spot.kind === 'gap'
    ? `A ${spot.metres} m gap in ${lineOwner} line, bridged by the router`
    : `The line strays up to ${spot.metres} m from ${lineOwner}`;

/**
 * How many places there are to check in a drawing seeded from a route's line (check-spots.ts),
 * and each as a button that takes the camera there. The OSM and old Para hints share it.
 */
export function CheckSpotList({ spots, lineOwner, onLookAt }: CheckSpotListProps) {
  return (
    <>
      <p>
        {spots.length === 0
          ? `Nothing to check against ${lineOwner} line yet.`
          : `${spots.length} ${spots.length === 1 ? 'place' : 'places'} to check`}
      </p>
      {spots.length > 0 && (
        <ol className="flex flex-col gap-1">
          {spots.map((spot, index) => (
            <li key={`${spot.kind}-${spot.at.join(',')}`}>
              <button
                type="button"
                onClick={() => onLookAt(spot.at)}
                className="w-full rounded-xl p-2 text-left hover:bg-surface-secondary focus-visible:bg-surface-secondary"
              >
                {index + 1}. {spotWords(spot, lineOwner)}
              </button>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
