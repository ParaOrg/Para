import { EndIcon, StartIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

export type RouteStopSignKind = 'start' | 'end';

interface RouteStopSignProps {
  kind: RouteStopSignKind;
}

/** Start's green and End's red (direction/start and direction/end): the pill, and its icon and word. */
const LOOK = {
  start: 'bg-direction-start-surface text-direction-start-fill',
  end: 'bg-direction-end-surface text-direction-end-fill',
} satisfies Record<RouteStopSignKind, string>;

/**
 * Where a trip or a ride starts and ends (Figma's Start and End, 4822:46013 and 4822:46019), under
 * a stop's name and over the ends card's places: S or E, 16, and the word, SemiBold 14/20, on a
 * round pill, 4 in before the sign and 6 after the word. The word is real text, so a screen reader
 * hears it with the place.
 */
export function RouteStopSign({ kind }: RouteStopSignProps) {
  return (
    <span
      className={cn(
        'flex w-fit shrink-0 items-center gap-1 rounded-full py-0.5 pr-1.5 pl-1 text-sm/5 font-semibold',
        LOOK[kind],
      )}
    >
      <span aria-hidden data-part={kind} className="flex size-4 shrink-0 *:size-full">
        {kind === 'start' ? <StartIcon /> : <EndIcon />}
      </span>
      {kind === 'start' ? 'Start' : 'End'}
    </span>
  );
}
