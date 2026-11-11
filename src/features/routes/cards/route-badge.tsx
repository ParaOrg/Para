import { cn } from '@/shared/utils/cn';

import { ROUTE_BADGE } from './route-card-look';
import type { Livery } from '../model/liveries';

type RouteBadgeSize = 'medium' | 'large';

interface RouteBadgeProps {
  /** Figma's label: a mode, a train's line or bound, or a station's code. */
  label: string;
  /** The card it sits on, whose colours it wears (ROUTE_BADGE). */
  livery: Livery;
  /**
   * Medium on a RouteCard, SemiBold 14/20 on a chip rounded 6 (4679:20449); large atop a trip's
   * stops card, SemiBold 18/28 on a chip rounded 8 (RouteStopsCard, 4681:29138).
   */
  size?: RouteBadgeSize;
}

const SIZE = {
  medium: 'rounded-md px-1.5 text-sm/5',
  large: 'rounded-lg px-2.5 py-0.5 text-lg/7',
} satisfies Record<RouteBadgeSize, string>;

/** Figma's RouteBadge: a word on a chip in the card's colours. */
export function RouteBadge({ label, livery, size = 'medium' }: RouteBadgeProps) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center font-semibold whitespace-nowrap',
        SIZE[size],
        ROUTE_BADGE[livery],
      )}
    >
      {label}
    </span>
  );
}
