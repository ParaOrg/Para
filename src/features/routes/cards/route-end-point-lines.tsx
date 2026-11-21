import { cn } from '@/shared/utils/cn';

import './route-end-point-lines.css';

export type RouteEndPointPosition = 'top' | 'bottom' | 'through';

/** Where the arrow sits: at the row's middle, or 12 down, beside its first line of words. */
type RouteEndPointArrowAlign = 'center' | 'first-line';

const LEAD_IN = {
  center: 'min-h-px flex-1',
  'first-line': 'h-3 shrink-0',
} satisfies Record<RouteEndPointArrowAlign, string>;

interface RouteEndPointLinesProps {
  /**
   * Figma's Property 1 (4235:12313): Top, a row with more rows below it, the line running on
   * past its arrow; Bottom, the last row, the line ending at its arrow. Through, the line alone,
   * no arrow: beside a heading over the rows (VectorLineTopBottom in DestinationGroup, 4821:37271).
   */
  position: RouteEndPointPosition;
  /** At Figma's opacity/80, as a RouteEndPointBar on the surface draws it; else at full. */
  isFaint?: boolean;
  /**
   * Centred on a RouteCard's one-line rows; beside the first line on a trip's DestinationBar
   * (4820:33754), whose via line under the place would otherwise pull the arrow down between them.
   */
  arrowAlign?: RouteEndPointArrowAlign;
}

/**
 * The tree line before a row of places, joining the rows to the place above them: on a RouteCard
 * (RouteEndPointBar) and under a trip's ends (DestinationBar, and through beside its list's
 * heading). Figma's own VectorLine drawings in the words' colour, stretched to the row's height
 * around a fixed 16px middle; through, the straight line alone.
 */
export function RouteEndPointLines({
  position,
  isFaint = true,
  arrowAlign = 'center',
}: RouteEndPointLinesProps) {
  const isBottom = position === 'bottom';
  if (position === 'through') {
    return (
      <span aria-hidden className={cn('flex w-6 shrink-0 self-stretch', isFaint && 'opacity-80')}>
        <span className="route-end-point-line route-end-point-line-top-bottom w-4" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn('flex w-6 shrink-0 flex-col items-start self-stretch', isFaint && 'opacity-80')}
    >
      <span
        className={cn(
          'route-end-point-line route-end-point-line-top-bottom w-4',
          LEAD_IN[arrowAlign],
        )}
      />
      <span className="flex h-4 w-full items-center">
        <span
          className={
            'route-end-point-line size-4 shrink-0 ' +
            (isBottom ? 'route-end-point-line-middle-bottom' : 'route-end-point-line-middle')
          }
        />
        <span className="route-end-point-line route-end-point-line-arrow h-4 w-2 shrink-0" />
      </span>
      {isBottom ? (
        <span className="min-h-px w-4 flex-1" />
      ) : (
        <span className="route-end-point-line route-end-point-line-top-bottom min-h-px w-4 flex-1" />
      )}
    </span>
  );
}
