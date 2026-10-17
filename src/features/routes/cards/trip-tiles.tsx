import { ReloadIcon } from '@/shared/ui/route-icons';
import { kmLabel } from '@/shared/utils/geo';

import { FREE, type Fare } from './trip-fare';

interface TripTilesProps {
  /** The fare the tile shows, or FREE; omitted when unpriced, and the tile with it. */
  shown: Fare | undefined;
  shownMetres: number;
  /** Whether the tile shows the Discounted fare. */
  discounted: boolean;
  /** How many times the fare tile was tapped: ↻ turns once more for each. */
  turns: number;
  /** The fare tile was tapped: turn it to the other fare. */
  onTurn: () => void;
}

/**
 * 16 under the card, or under the signboards' strip (Figma 3778:3186). The tiles 8 apart (3778:3183,
 * its row 3886:6278).
 */
export function TripTiles({ shown, shownMetres, discounted, turns, onTurn }: TripTilesProps) {
  return (
    <div
      data-testid="trip-tiles"
      className="flex w-full gap-2 bg-surface px-3 py-4 text-center font-sn-pro"
    >
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
            aria-label={`${discounted ? 'Discounted' : 'Regular'} fare ${discounted ? shown.discounted : shown.regular}. Show the ${discounted ? 'regular' : 'discounted'} fare`}
            onClick={onTurn}
            className={
              TILE +
              ' transition-colors duration-quick ease-move hover:bg-surface-tertiary active:bg-surface-quaternary'
            }
          >
            <span data-testid="trip-fare" className={FIGURE}>
              {discounted ? shown.discounted : shown.regular}
            </span>
            <span className={NAME + ' flex items-center gap-1.5'}>
              <span
                aria-hidden
                style={{ rotate: `${turns * 360}deg` }}
                className="size-4 shrink-0 text-content-quaternary transition-[rotate] duration-turn ease-move *:size-full motion-reduce:transition-none"
              >
                <ReloadIcon />
              </span>
              {discounted ? 'Discounted fare' : 'Regular fare'}
            </span>
          </button>
        )
      )}
    </div>
  );
}

/**
 * One of the two tiles under the card, in Figma's row of them (3771:3055): its figure over its name
 * (the figure on top, 3778:3183), on Background/surface-secondary. Figma writes the figure in a raw
 * black; Content/primary is the token nearest it.
 */
const TILE =
  'flex min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-2 rounded-2xl bg-surface-secondary p-4';
const FIGURE = 'block text-2xl/8 font-bold text-content-primary';
const NAME = 'block text-sm/5 font-normal text-content-tertiary';
