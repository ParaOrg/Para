import type { ReactNode } from 'react';

import { FRAMED_SHARE, slide } from '@/shared/ui/sheet-gesture';
import { cn } from '@/shared/utils/cn';

interface MapControlsDockProps {
  /** The controls, the one nearest the sheet first: on a phone the lowest, on a wide map the left. */
  children: ReactNode;
  /** On a phone, right of the map's ⓘ at the bottom left (the studio's), not 16 in. */
  isBesideCredits?: boolean;
  /** At the map's top left, 16 in and 16 down, following no sheet: beside a trip in a side panel. */
  isAtTopLeft?: boolean;
}

/**
 * Where the controls of the cards on show float on the public map (4885:41761, 4886:47571): the
 * route list's Vice Versa and Overview, a trip's Overview. On a phone they stand at the map's
 * bottom left, 16 in and `--dock-gap` over the card's sheet, a column from the sheet up, 12 apart.
 * They follow it up to the middle (FRAMED_SHARE) and stay there, the sheet sliding over them
 * higher, as the locate-me column does (4885:41761, "The Button Stays in the middle"). Where the card docks on the left of
 * a wide map (`@float:`), they stand in a row at the map's top, 16 down and 16 right of the card.
 */
export function MapControlsDock({
  children,
  isBesideCredits = false,
  isAtTopLeft = false,
}: MapControlsDockProps) {
  if (isAtTopLeft)
    return (
      <div
        data-testid="map-controls"
        className="absolute top-4 left-4 z-[5] flex flex-row items-start gap-3"
      >
        {children}
      </div>
    );
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
          'pointer-events-auto absolute bottom-full mb-[var(--dock-gap,0.75rem)] flex flex-col-reverse items-start gap-3',
          // Right of the ⓘ (MapCreditsDock's 12 in, 32 across, and 8 between), or 16 in.
          isBesideCredits
            ? 'left-[calc(3.25rem+env(safe-area-inset-left))]'
            : 'left-[calc(1rem+env(safe-area-inset-left))]',
          '@float:top-[calc(1rem+env(safe-area-inset-top))] @float:bottom-auto @float:left-100 @float:mb-0 @float:flex-row',
        )}
      >
        {children}
      </div>
    </div>
  );
}
