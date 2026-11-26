import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';

interface MapControlsDockProps {
  /** The controls, the one nearest the sheet first: on a phone the lowest, on a wide map the left. */
  children: ReactNode;
}

/** The highest it rides: just under the status bar, over the sheet below. */
const HIGHEST = 'calc(var(--map-safe-top, env(safe-area-inset-top)) + 2.75rem)';

/**
 * Where the controls of the cards on show float on the public map (4885:41761, 4886:47571): the
 * route list's Vice Versa and Overview, a trip's Overview. On a phone they stand at the map's
 * bottom left, 16 in and `--dock-gap` over the card's sheet, following it at every height as the
 * locate-me column does, a column from the sheet up, 12 apart. Where the card docks on the left of
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
      style={{ translate: `0 max(var(--dock-y, 100%), ${HIGHEST})` }}
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
