import { ReloadIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import { FREE, farePesos, type Fare } from './trip-fare';
import { FIGURE, NAME, PRESSABLE, TILE } from './trip-tile-look';

interface FareTileProps {
  shown: Fare;
  kind: string;
  isDiscounted: boolean;
  turns: number;
  onTurn: () => void;
}

/** The fare: Free on its own, or the pesos, a button that turns them Regular ↔ Discounted. */
export function FareTile({ shown, kind, isDiscounted, turns, onTurn }: FareTileProps) {
  if (shown === FREE) {
    return (
      <div className={TILE}>
        <span data-testid="trip-fare" className={FIGURE}>
          Free
        </span>
        <span className={NAME}>Fare</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      data-testid="trip-fare-turn"
      // The words on the tile first, as they read, so saying them reaches the button.
      aria-label={`${farePesos(shown, isDiscounted)} ${kind}. Show the ${isDiscounted ? 'regular' : 'discounted'} fare`}
      onClick={onTurn}
      className={cn(TILE, PRESSABLE)}
    >
      <span data-testid="trip-fare" className={FIGURE}>
        {farePesos(shown, isDiscounted)}
      </span>
      <span className={cn(NAME, 'flex items-center gap-2')}>
        {kind}
        <span
          aria-hidden
          style={{ rotate: `${turns * 360}deg` }}
          className="size-4 shrink-0 transition-[rotate] duration-turn ease-move *:size-full motion-reduce:transition-none"
        >
          <ReloadIcon />
        </span>
      </span>
    </button>
  );
}
