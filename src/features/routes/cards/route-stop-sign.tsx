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
 * Where a ride starts and ends, under a stop's name (the Start and End pills in RouteHintuans'
 * Content Slot, 4796:29441 and 4796:29447): S or E, 16, and the word, SemiBold 16/24, on a pill
 * rounded 8. Figma's End pill shows an S, the code an E. The word is real text, so
 * a screen reader hears it with the stop's name.
 */
export function RouteStopSign({ kind }: RouteStopSignProps) {
  return (
    <span
      className={cn(
        'flex w-fit items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-base-lower font-semibold',
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
