import { Button } from '@/design-system/primitives/button';
import { JeepIcon } from '@/shared/ui/route-icons';

interface HintuanCardCounterProps {
  /** "2 routes pass here". */
  count: string;
  /** The word on SWITCH (switchWord). */
  word: string;
  /** Whether the other way round is showing, for the suites (`data-back`). */
  back: boolean;
  /** False when there is no box passed the other way; SWITCH then rests disabled. */
  canSwitch: boolean;
  onFlip: () => void;
}

/**
 * HintuanCardRouteCounter (3851:12206), across the join of the rows and the cards, 24 in.
 */
export function HintuanCardCounter({
  count,
  word,
  back,
  canSwitch,
  onFlip,
}: HintuanCardCounterProps) {
  return (
    <div className="absolute inset-x-0 -top-6 z-10 px-6">
      <div className="flex w-full items-center gap-2 rounded-full bg-surface py-3 pr-3 pl-4">
        <div className="flex min-w-0 flex-1 items-center gap-1 text-content-primary">
          <span aria-hidden className="size-5 shrink-0 *:size-full">
            <JeepIcon />
          </span>
          <p
            data-testid="card-count"
            className="min-w-0 flex-1 truncate font-sn-pro text-base/6 font-black"
          >
            {count}
          </p>
        </div>
        <Button
          variant="special"
          size="small"
          label={word}
          data-testid="card-flip"
          data-back={back}
          disabled={!canSwitch}
          onClick={onFlip}
        />
      </div>
    </div>
  );
}
