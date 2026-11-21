import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';

interface MapControlsDockProps {
  /** Whether the map's ⓘ (MapCreditsDock) is there, at the left, for the controls to stand beside. */
  isBesideCredits: boolean;
  /** The controls, the one nearest the sheet first: on a phone the lowest, on a wide map the top. */
  children: ReactNode;
}

/** The highest it rides, as the ⓘ beside it: just under the status bar, over the sheet below. */
const HIGHEST = 'calc(var(--map-safe-top, env(safe-area-inset-top)) + 2.75rem)';

/**
 * Where the controls of the cards on show float on the public map (Figma 4831:54489, 4831:54492):
 * the route list's Vice Versa and sliders, a trip's Overview. On a phone they stand at the map's
 * bottom left, `--dock-gap` over the card's sheet (16 on the public map, as the frames draw it, the
 * locate-me column beside it alike), following it at every height as the ⓘ and that column do, a
 * column from the sheet up; beside the ⓘ, which the frames leave out and the page keeps at the
 * left. Where the card docks on the left of a wide map (`@float:`), they stand at the map's top, 8
 * right of the card, a column from the top down.
 */
export function MapControlsDock({ isBesideCredits, children }: MapControlsDockProps) {
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
          'pointer-events-auto absolute bottom-full mb-[var(--dock-gap,0.75rem)] flex flex-col-reverse items-start gap-2',
          isBesideCredits
            ? 'left-[calc(3.25rem+env(safe-area-inset-left))]'
            : 'left-[calc(0.75rem+env(safe-area-inset-left))]',
          '@float:top-[calc(0.5rem+env(safe-area-inset-top))] @float:bottom-auto @float:left-98 @float:mb-0 @float:flex-col',
        )}
      >
        {children}
      </div>
    </div>
  );
}
