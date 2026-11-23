import type { ReactNode } from 'react';

import { EndIcon, IkotIcon, StartIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import { LOOP_WORD } from '../model/routes';

export type RouteStopSignKind = 'start' | 'end' | 'ikot';

interface RouteStopSignProps {
  kind: RouteStopSignKind;
}

/**
 * Start's green and End's red (direction/start and direction/end), and a loop's grey Ikot
 * (bg/surface/surface-secondary, text/primary): the pill, and its icon and word.
 */
const LOOK = {
  start: 'bg-direction-start-surface text-direction-start-fill',
  end: 'bg-direction-end-surface text-direction-end-fill',
  ikot: 'bg-bg-surface-secondary text-text-primary',
} satisfies Record<RouteStopSignKind, string>;

const ICON = {
  start: <StartIcon />,
  end: <EndIcon />,
  ikot: <IkotIcon />,
} satisfies Record<RouteStopSignKind, ReactNode>;

const WORD = {
  start: 'Start',
  end: 'End',
  ikot: LOOP_WORD,
} satisfies Record<RouteStopSignKind, string>;

/**
 * Where a trip or a ride starts and ends (Figma's Start and End, 4822:46013 and 4822:46019), under
 * a stop's name and over the ends card's places, and a loop's Ikot over its name (4825:49053): S or E, 16, and the word, SemiBold 14/20, on a
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
        {ICON[kind]}
      </span>
      {WORD[kind]}
    </span>
  );
}
