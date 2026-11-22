import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';

interface MapControlsDockProps {
  /** The controls, the one nearest the sheet first: on a phone the lowest, on a wide map the top. */
  children: ReactNode;
}

/** The highest it rides: just under the status bar, over the sheet below. */
const HIGHEST = 'calc(var(--map-safe-top, env(safe-area-inset-top)) + 2.75rem)';

/**
 * Where the controls of the cards on show float on the public map (Figma 4831:54489, 4831:54492):
 * the route list's Vice Versa and sliders, a trip's Overview. On a phone they stand at the map's
 * bottom left, `--dock-gap` over the card's sheet (16 on the public map, as the frames draw it, the
 * locate-me column alike), following it at every height as that column does, a column from the
 * sheet up at the map's left edge; the map's ⓘ is in its top-left corner. Where the card docks on the left of a wide map (`@float:`), they stand at the map's top, 8
 * right of the card, a column from the top down.
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
          'pointer-events-auto absolute bottom-full left-[calc(0.75rem+env(safe-area-inset-left))] mb-[var(--dock-gap,0.75rem)] flex flex-col-reverse items-start gap-2',
          '@float:top-[calc(0.5rem+env(safe-area-inset-top))] @float:bottom-auto @float:left-98 @float:mb-0 @float:flex-col',
        )}
      >
        {children}
      </div>
    </div>
  );
}
