import type { ReactNode } from 'react';

import { FRAMED_SHARE, slide } from '@/shared/ui/sheet-gesture';
import { cn } from '@/shared/utils/cn';

interface MapControlsDockProps {
  /** The controls, the one nearest the sheet first: on a phone the lowest, on a wide map the left. */
  children: ReactNode;
}

/**
 * Where the controls of the cards on show float on the public map (4885:41761, 4886:47571): the
 * route list's Vice Versa and Overview, a trip's Overview. On a phone they stand at the map's
 * bottom left, 16 in and `--dock-gap` over the card's sheet, a column from the sheet up, 12 apart.
 * They follow it up to the middle (FRAMED_SHARE) and stay there, the sheet sliding over them
 * higher, as the locate-me column does (4885:41761, "The Button Stays in the middle"). Where the card docks on the left of
 * a wide map (`@float:`), they stand in a row at the map's top, 16 down and 16 right of the card.
 */
export function MapControlsDock({ children }: MapControlsDockProps) {
  return (
    <div
      data-dock-follower
      className={
        'pointer-events-none absolute inset-0 z-[5] ' +
        'transition-[translate] duration-sheet ease-enter in-data-dock-dragging:transition-none motion-reduce:transition-none ' +
        '@float:translate-none!'
      }
      style={{ translate: `0 max(var(--dock-y, 100%), ${slide(FRAMED_SHARE)})` }}
    >
      <div
        data-testid="map-controls"
        className={cn(
          'pointer-events-auto absolute bottom-full left-[calc(1rem+env(safe-area-inset-left))] mb-[var(--dock-gap,0.75rem)] flex flex-col-reverse items-start gap-3',
          '@float:top-[calc(1rem+env(safe-area-inset-top))] @float:bottom-auto @float:left-100 @float:mb-0 @float:flex-row',
        )}
      >
        {children}
      </div>
    </div>
  );
}
