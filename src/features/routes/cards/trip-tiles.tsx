import { ReloadIcon } from '@/shared/ui/route-icons';
import { kmLabel } from '@/shared/utils/geo';

import { FREE, type Fare } from './trip-fare';

interface TripTilesProps {
  /** The fare the tile shows, or FREE; undefined when unpriced, and the tile with it. */
  shown: Fare | undefined;
  shownMetres: number;
  /** Whether the tile shows the Discounted fare. */
  isDiscounted: boolean;
  /** How many times the fare tile was tapped: ↻ turns once more for each. */
  turns: number;
  /** The fare tile was tapped: turn it to the other fare. */
  onTurn: () => void;
}

/** The ride's two tiles, side by side and 12 apart (RouteTripDetail, 4680:25114). */
export function TripTiles({ shown, shownMetres, isDiscounted, turns, onTurn }: TripTilesProps) {
  return (
    <div data-testid="trip-tiles" className="flex w-full gap-3 text-center font-sn-pro">
      <div className={TILE}>
        <span data-testid="trip-km" className={FIGURE}>
          {kmLabel(shownMetres)}
        </span>
        <span className={NAME}>Distance</span>
      </div>
      {shown === FREE ? (
        <div className={TILE}>
          <span data-testid="trip-fare" className={FIGURE}>
            Free
          </span>
          <span className={NAME}>Fare</span>
        </div>
      ) : (
        shown && (
          <button
            type="button"
            data-testid="trip-fare-turn"
            aria-label={`${isDiscounted ? 'Discounted' : 'Regular'} fare ${isDiscounted ? shown.discounted : shown.regular}. Show the ${isDiscounted ? 'regular' : 'discounted'} fare`}
            onClick={onTurn}
            className={
              TILE +
              ' transition-colors duration-quick ease-move hover:bg-surface-secondary active:bg-surface-tertiary'
            }
          >
            <span data-testid="trip-fare" className={FIGURE}>
              {isDiscounted ? shown.discounted : shown.regular}
            </span>
            <span className={NAME + ' flex items-center gap-1.5'}>
              <span
                aria-hidden
                style={{ rotate: `${turns * 360}deg` }}
                className="size-4 shrink-0 text-content-quaternary transition-[rotate] duration-turn ease-move *:size-full motion-reduce:transition-none"
              >
                <ReloadIcon />
              </span>
              {isDiscounted ? 'Discounted fare' : 'Regular fare'}
            </span>
          </button>
        )
      )}
    </div>
  );
}

/**
 * One tile (4680:25115): its figure, Bold 24/32, over its name, Regular 14/20, on a white card
 * rounded 24 under shadow-large. The fare's, a button, darkens a step under the finger.
 */
const TILE =
  'flex min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-2 overflow-clip rounded-3xl bg-surface p-4 shadow-large';
const FIGURE = 'block text-2xl/8 font-bold text-content-primary';
const NAME = 'block text-sm/5 font-normal text-content-tertiary';
