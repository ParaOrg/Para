import { cn } from '@/shared/utils/cn';

import { ROUTE_BADGE } from './route-card-look';
import type { Livery } from '../model/liveries';

interface RouteBadgeProps {
  /** Figma's label: a mode, a train's line or bound, or a station's code. */
  label: string;
  /** The card it sits on, whose colours it wears (ROUTE_BADGE). */
  livery: Livery;
}

/** Figma's RouteBadge (4679:20449): a word on a chip in the card's colours, SemiBold 14/20. */
export function RouteBadge({ label, livery }: RouteBadgeProps) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md px-1.5 text-sm/5 font-semibold whitespace-nowrap',
        ROUTE_BADGE[livery],
      )}
    >
      {label}
    </span>
  );
}
