import { CarouselStationField } from './carousel-station-field';
import type { SignboardGroup } from './hotspot-checks';

interface PassesThroughProps {
  /** The directions under the outline, under their route's name (groupBySignboard). */
  groups: SignboardGroup[];
  /** The hintuan's station line, which decides what passes (servedBy): null for a jeep hintuan. */
  station?: string | null;
  /** Marks it an EDSA Carousel station or not; absent, no such choice is shown. */
  onStationChange?: (line: string | null) => void;
}

/**
 * A hintuan's routes: a read-only preview of the directions that pass under
 * the outline — the polygon decides, and this shows exactly what the save
 * will write.
 */
export function PassesThrough({ groups, station = null, onStationChange }: PassesThroughProps) {
  return (
    <div className="mt-4">
      {onStationChange && <CarouselStationField line={station} onChange={onStationChange} />}
      <p className="text-xs font-medium text-neutral-700">
        Passes through{' '}
        <span className="font-normal text-neutral-400">— decided by the outline</span>
      </p>
      {groups.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">
          No saved route passes under this outline yet. It will pick up routes drawn through it
          later.
        </p>
      ) : (
        <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1 text-sm">
          {groups.map((g) => (
            <li key={g.signboard} className="text-neutral-700">
              <span className="font-medium text-neutral-900">{g.signboard}</span>
              <span className="text-neutral-500">
                {' '}
                · {g.directions.map((v) => v.name).join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
