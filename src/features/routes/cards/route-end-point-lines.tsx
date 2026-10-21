import './route-end-point-lines.css';

export type RouteEndPointPosition = 'top' | 'bottom';

interface RouteEndPointLinesProps {
  /**
   * Figma's Property 1 (4235:12313): Top, a row with more rows below it, the line running on
   * past its stub; Bottom, the last row, the line ending at its stub.
   */
  position: RouteEndPointPosition;
}

/**
 * The tree line before a RouteCard's row, joining the rows to the place above them. Figma's own
 * VectorLine drawings in the card's words' colour at Figma's opacity/70, as the mode's label
 * above them, stretched to the row's height around a fixed 16px middle.
 */
export function RouteEndPointLines({ position }: RouteEndPointLinesProps) {
  const isBottom = position === 'bottom';
  return (
    <span aria-hidden className="flex w-6 shrink-0 flex-col items-start self-stretch opacity-70">
      <span className="route-end-point-line route-end-point-line-top-bottom min-h-px w-4 flex-1" />
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
