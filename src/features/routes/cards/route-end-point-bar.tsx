import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { ROW_PRESSED } from './livery-card';
import { RouteEndPointLines, type RouteEndPointPosition } from './route-end-point-lines';
import type { Livery } from '../model/liveries';

type RouteEndPointBarSize = 'base' | 'xl';

type Props = Omit<ComponentPropsWithoutRef<'button'>, 'type' | 'children' | 'slot'> & {
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
  /** Figma's ❄️ Slot, after the name: a station's badge on a RouteCardRailway. Empty on every other row. */
  slot?: ReactNode;
  /** The row's words: base, SemiBold 17/24 (RouteCard); xl, Medium 20/28 (RouteCardRailway). */
  size?: RouteEndPointBarSize;
};

const BAR = 'flex w-full items-center px-4 text-left';
const SIZE_CLASSES = {
  base: 'text-base/6 font-semibold',
  xl: 'text-xl/7 font-medium',
} satisfies Record<RouteEndPointBarSize, string>;
// Pressed, Background/surface-tertiary, as Figma's RouteTripDetail Pressed draws it. The hover is
// tertiary too.
const ON_SURFACE =
  'gap-2 rounded-full text-content-primary transition-colors duration-quick ease-move hover:bg-surface-tertiary active:bg-surface-tertiary';
const ON_CARD = 'gap-1';

/**
 * Figma's .RouteEndPointBar (3848:11928): a route by where it goes, the tree line before it, a
 * button that opens it. One component where Figma has one, so a change to the row is made once: a
 * RouteCard's rows and a trip's "Other routes", both 40 tall.
 */
export function RouteEndPointBar({
  routeDirection,
  on,
  position,
  slot,
  size = 'base',
  className,
  ...rest
}: Props) {
  const isOnSurface = on === 'surface';
  return (
    <button
      type="button"
      {...rest}
      className={
        BAR +
        ' ' +
        SIZE_CLASSES[size] +
        ' ' +
        (isOnSurface ? ON_SURFACE : ON_CARD + ' ' + ROW_PRESSED[on]) +
        (className ? ' ' + className : '')
      }
    >
      <RouteEndPointLines position={position} />
      <span className="flex min-w-0 flex-1 items-center gap-1 py-2">
        <span className="min-w-0 flex-1">{routeDirection}</span>
        {slot}
      </span>
    </button>
  );
}
