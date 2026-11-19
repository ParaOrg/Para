import { ReloadIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';
import { kmLabel } from '@/shared/utils/geo';

import { FREE, farePesos, type Fare } from './trip-fare';

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

/**
 * The ride's two tiles, side by side and 12 apart (BottomContent, 4796:29410): the fare on the
 * left, the distance on the right. Unpriced, the distance takes the row alone.
 */
export function TripTiles({ shown, shownMetres, isDiscounted, turns, onTurn }: TripTilesProps) {
  return (
    <div data-testid="trip-tiles" className="flex w-full gap-3 text-center font-sn-pro">
      {shown === FREE && (
        <div className={TILE}>
          <span data-testid="trip-fare" className={FIGURE}>
            Free
          </span>
          <span className={NAME}>Fare</span>
        </div>
      )}
      {shown !== undefined && shown !== FREE && (
        <button
          type="button"
          data-testid="trip-fare-turn"
          aria-label={`${isDiscounted ? 'Discounted' : 'Regular'} fare ${farePesos(shown, isDiscounted)}. Show the ${isDiscounted ? 'regular' : 'discounted'} fare`}
          onClick={onTurn}
          className={cn(TILE, PRESSABLE)}
        >
          <span data-testid="trip-fare" className={FIGURE}>
            {farePesos(shown, isDiscounted)}
          </span>
          <span className={cn(NAME, 'flex items-center gap-2')}>
            {isDiscounted ? 'Discounted fare' : 'Regular fare'}
            <span
              aria-hidden
              style={{ rotate: `${turns * 360}deg` }}
              className="size-4 shrink-0 transition-[rotate] duration-turn ease-move *:size-full motion-reduce:transition-none"
            >
              <ReloadIcon />
            </span>
          </span>
        </button>
      )}
      <div className={TILE}>
        <span data-testid="trip-km" className={FIGURE}>
          {kmLabel(shownMetres)}
        </span>
        <span className={NAME}>Distance</span>
      </div>
    </div>
  );
}

/**
 * One tile (4796:29411): its figure, Bold 24/32, over its name, Medium 14/20, on bg-fill rounded
 * 24, 14 in, under shadow-sm.
 */
const TILE =
  'flex min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 overflow-clip rounded-3xl bg-bg-fill p-3.5 shadow-sm';
const FIGURE = 'block text-2xl/8 font-bold text-text-primary';
const NAME = 'block text-sm/5 font-medium text-text-tertiary';
// Figma draws no hover or pressed state; the fare's, a button, keeps today's step darker under
// the finger, on the nearest new token.
const PRESSABLE =
  'transition-colors duration-quick ease-move hover:bg-bg-fill-secondary active:bg-bg-fill-secondary';
