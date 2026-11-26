import type { Ref } from 'react';

import { CreditsButton } from './credits-button';

interface MapCreditsDockProps {
  /** Whether a card's sheet is open: at the bottom left, the ⓘ rides above its top, as the LocatorButton does. */
  isDocked: boolean;
  /**
   * Where it stands on a phone: at the bottom left over the sheet (the studio), or in the map's
   * top-left corner, 28 across, 16 in and 24 down (the public map, 4885:44809). Where the card
   * floats on a wide map (`@float:`), the studio's stands at the map's bottom left and the public
   * map's at its top right, 16 in and 24 down (4886:47571).
   */
  corner?: 'bottom-left' | 'top-left';
  onOpen: () => void;
  /** For focus to come back to when the credits close. */
  buttonRef: Ref<HTMLButtonElement>;
}

/**
 * The highest the ⓘ rides: just under the status bar, its 32 and the 12 over the sheet below it.
 * A card pulled higher (Max leaves a strip of 24) slides over the ⓘ's foot; its top stays out.
 */
const HIGHEST = 'calc(var(--map-safe-top, env(safe-area-inset-top)) + 2.75rem)';

/**
 * The map's ⓘ on the public map and the studio's, as the contributor page's Start has it (Figma
 * 4494:2048): at the map's bottom left, 12 in. With a card open it stands 12 over the card's
 * sheet and follows it at every height, as long as there is room above it: MapLibre's corner
 * credits are gone, so the ⓘ is the licences' credit and must stay reachable over any map left
 * showing. Where the card floats in the top-left corner (`@float:`), it stays at the map's
 * bottom left.
 */
export function MapCreditsDock({
  isDocked,
  corner = 'bottom-left',
  onOpen,
  buttonRef,
}: MapCreditsDockProps) {
  // In the corner it stays put, over the sheet (z-20 to its z-10): a card at full height leaves
  // only a strip of 24 under the status bar, and the ⓘ, the licences' credit, must stay
  // reachable; it then stands over the sheet's corner, left of its handle. The place search,
  // hidden for now, would start there: if it comes back, it starts right of the ⓘ, or the ⓘ
  // moves under it.
  const isInCorner = corner === 'top-left';
  const y = isInCorner ? '0' : isDocked ? `max(var(--dock-y, 100%), ${HIGHEST})` : '100%';
  return (
    <div
      data-dock-follower
      className={
        'pointer-events-none absolute inset-0 ' +
        (isInCorner ? 'z-20 @float:z-[5] ' : 'z-[5] ') +
        'transition-[translate] duration-sheet ease-enter in-data-dock-dragging:transition-none motion-reduce:transition-none ' +
        '@float:translate-none!'
      }
      style={{ translate: `0 ${y}` }}
    >
      <div
        className={
          'pointer-events-auto absolute flex ' +
          (isInCorner
            ? 'top-[calc(var(--map-safe-top,env(safe-area-inset-top))+1.5rem)] left-[calc(1rem+env(safe-area-inset-left))] ' +
              '@float:right-[calc(1rem+env(safe-area-inset-right))] @float:left-auto'
            : 'bottom-full left-[calc(0.75rem+env(safe-area-inset-left))] @float:top-auto @float:bottom-[max(0.75rem,env(safe-area-inset-bottom))] @float:mb-0 ' +
              (isDocked ? 'mb-3' : 'mb-[max(0.75rem,env(safe-area-inset-bottom))]'))
        }
      >
        <CreditsButton ref={buttonRef} onClick={onOpen} size={isInCorner ? 'sm' : 'md'} />
      </div>
    </div>
  );
}
