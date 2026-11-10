import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';

import { ROW_PRESSED } from './livery-card';
import { RouteEndPointLines, type RouteEndPointPosition } from './route-end-point-lines';
import type { Livery } from '../model/liveries';

type RouteEndPointBarSize = 'base' | 'medium' | 'xl';

type RouteEndPointBarProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'type' | 'children' | 'slot'
> & {
  /** Figma's routeDirection: the place the row's route goes to. */
  routeDirection: string;
  /**
   * What the row sits on, Figma's variant: a RouteCard in its livery (RouteCard), the row pressing
   * to the card's timeline colour (ROW_PRESSED); or the sheet's own surface, under a trip's tiles
   * (RouteTripDetail), the row rounded and pressing grey as the fare tile does.
   */
  on: Livery | 'surface';
  /** Where the row sits among its rows, which decides how its tree line ends. */
  position: RouteEndPointPosition;
  /** Figma's ❄️ Slot, after the name: a station's code on a train RouteCard's rows. Empty on every other row. */
  slot?: ReactNode;
  /**
   * The row's words: base, SemiBold 17/24, 40 tall (a trip's Other routes); medium, Medium 17/24,
   * 32 tall, its tree line at full strength (RouteCard, 4629:22776); xl, SemiBold 20/28
   * (RouteCardRailway, 4633:25360).
   */
  size?: RouteEndPointBarSize;
};

const BAR = 'flex w-full items-center text-left';
const SIZE_CLASSES = {
  base: 'text-base/6 font-semibold',
  medium: 'text-base/6 font-medium',
  xl: 'text-xl/7 font-semibold',
} satisfies Record<RouteEndPointBarSize, string>;
const WORDS_PADDING = {
  base: 'py-2',
  medium: 'py-1',
  xl: 'py-2',
} satisfies Record<RouteEndPointBarSize, string>;
// Pressed, Background/surface-tertiary, as Figma's RouteTripDetail Pressed draws it. The hover is
// tertiary too.
const ON_SURFACE =
  'gap-2 rounded-full px-4 text-content-primary transition-colors duration-quick ease-move hover:bg-surface-tertiary active:bg-surface-tertiary';
// RouteCard's 12 in from its edges, and 8 between the tree line and the words.
const ON_CARD = 'gap-2 px-3';

/**
 * Figma's .RouteEndPointBar (3848:11928): a route by where it goes, the tree line before it, a
 * button that opens it. One component where Figma has one, so a change to the row is made once: a
 * RouteCard's rows, a train's and a road mode's alike, and a trip's "Other routes".
 */
export function RouteEndPointBar({
  routeDirection,
  on,
  position,
  slot,
  size = 'base',
  className,
  ...rest
}: RouteEndPointBarProps) {
  const isOnSurface = on === 'surface';
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        BAR,
        SIZE_CLASSES[size],
        isOnSurface ? ON_SURFACE : cn(ON_CARD, ROW_PRESSED[on]),
        className,
      )}
    >
      <RouteEndPointLines position={position} isFaint={size !== 'medium'} />
      <span className={cn('flex min-w-0 flex-1 items-center gap-1', WORDS_PADDING[size])}>
        <span className="min-w-0 flex-1">{routeDirection}</span>
        {slot}
      </span>
    </button>
  );
}
