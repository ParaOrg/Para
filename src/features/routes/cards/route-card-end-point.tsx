import type { ComponentPropsWithoutRef } from 'react';

import { ROW_PRESSED } from './livery-card';
import { RouteEndPointLines, type RouteEndPointPosition } from './route-end-point-lines';
import type { Livery } from '../model/liveries';

type Props = Omit<ComponentPropsWithoutRef<'button'>, 'type' | 'children'> & {
  /** Figma's routeDirection: the place the row's route goes to. */
  routeDirection: string;
  /** The card it sits on: the row presses to that livery's timeline colour (ROW_PRESSED). */
  livery: Livery;
  /** Where the row sits among its card's rows, which decides how its tree line ends. */
  position: RouteEndPointPosition;
};

/**
 * Figma's .RouteEndPointBar, variant RouteCard (3656:131): a card's row, the tree line joining it
 * to the place above, then the place it goes to, Medium 16/24 between 8 above and below; a button
 * that opens it. A trip's "Other routes" row is RouteEndPointBar.
 */
export function RouteCardEndPoint({ routeDirection, livery, position, className, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={
        'flex w-full items-center gap-2 px-4 text-left text-base/6 font-medium ' +
        ROW_PRESSED[livery] +
        (className ? ' ' + className : '')
      }
    >
      <RouteEndPointLines position={position} />
      <span className="min-w-0 flex-1 py-2">{routeDirection}</span>
    </button>
  );
}
