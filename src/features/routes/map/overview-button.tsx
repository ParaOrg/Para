import type { MapLibreMap } from 'maplibre-gl';

import { Button } from '@/design-system/primitives/button';
import { cn } from '@/shared/utils/cn';

import { useFocusMapOnHide } from './use-focus-map-on-hide';

interface OverviewButtonProps {
  /** Whether it shows: something is framed and the camera is not on it (useOverview). */
  isShown: boolean;
  /** The camera onto what is framed (useOverview). */
  go: () => void;
  /** Whether the map's ⓘ (MapCreditsDock) is there, at the left, for the button to stand beside. */
  isBesideCredits: boolean;
  /** The map, whose canvas takes focus if the button hides while it has it. */
  map: MapLibreMap | null;
}

/** The highest it rides, as the ⓘ beside it: just under the status bar, its 32 and 12 over the sheet. */
const HIGHEST = 'calc(var(--map-safe-top, env(safe-area-inset-top)) + 2.75rem)';

/**
 * The studio's Overview button: the design system's secondary button at
 * Small, 32 tall as the ⓘ beside it is, the camera back on the open trip's route or the picked
 * cards' routes. It shows only while a card is open, so on a phone it stands 12 over the card's
 * sheet and follows it at every height, as the ⓘ does, to the ⓘ's right (at the left with no ⓘ).
 * Where the card floats in the top-left corner (`@float:`), it stands in the locate-me button's
 * row, just right of the card. The public map's is OverviewPill, among the map's other controls.
 */
export function OverviewButton({ isShown, go, isBesideCredits, map }: OverviewButtonProps) {
  const ref = useFocusMapOnHide(isShown, map);

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
        ref={ref}
        hidden={!isShown}
        data-testid="overview"
        className={cn(
          'pointer-events-auto absolute bottom-full mb-3 flex',
          isBesideCredits
            ? 'left-[calc(3.25rem+env(safe-area-inset-left))]'
            : 'left-[calc(0.75rem+env(safe-area-inset-left))]',
          '@float:bottom-[max(2.5rem,calc(var(--dock-foot,0px)+0.75rem))] @float:left-99 @float:mb-0',
        )}
      >
        <Button variant="secondary" size="small" label="Overview" onClick={go} />
      </div>
    </div>
  );
}
