import { Button } from '@/design-system/primitives/button';

import { kilometres } from '../contribution-format';
import type { RideLine } from '../trail-parts';

interface RideListProps {
  rides: readonly RideLine[];
  onUse: (ride: RideLine) => void;
  /** The ride pointed at or focused, by its trail part, for the map; null when none is. */
  onHighlight: (piece: number | null) => void;
}

/**
 * An upload with more than one ride: each ride on its own row, in time order,
 * with its own Use this line, named with its ride ("Use this line: Ride 2").
 * Pointing at a row, or focusing its button, highlights that ride on the map.
 */
export function RideList({ rides, onUse, onHighlight }: RideListProps) {
  return (
    <ul aria-label="Rides" className="flex w-full flex-col gap-2">
      {rides.map((ride, i) => (
        <li
          key={ride.piece}
          className="flex items-center justify-between gap-2"
          onPointerEnter={() => onHighlight(ride.piece)}
          onPointerLeave={() => onHighlight(null)}
          onFocus={() => onHighlight(ride.piece)}
          onBlur={() => onHighlight(null)}
        >
          <span className="text-sm text-content-primary">
            Ride {i + 1} · {kilometres(ride.lengthM)}
          </span>
          {/* Named with its ride, as several sit together; the visible words start the name. */}
          <Button
            variant="primary"
            label="Use this line"
            aria-label={`Use this line: Ride ${i + 1}`}
            onClick={() => onUse(ride)}
          />
        </li>
      ))}
    </ul>
  );
}
