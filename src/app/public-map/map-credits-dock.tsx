import type { Ref } from 'react';

import { CreditsButton } from '@/features/routes/map/credits-button';
import { slide } from '@/shared/ui/sheet-gesture';

interface MapCreditsDockProps {
  /** Whether a card's sheet is open: the ⓘ rides above its top, as the LocatorButton does. */
  isDocked: boolean;
  onOpen: () => void;
  /** For focus to come back to when the credits close. */
  buttonRef: Ref<HTMLButtonElement>;
}

/**
 * The map's ⓘ on the public map, as the contributor page's Start has it (Figma 4494:2048): at the
 * map's bottom left, 12 in. With a card open it stands 12 over the card's sheet and follows it
 * down from Middle to Low, the way the LocatorButton follows it on the right (locator.tsx); up
 * past Middle it stays where Middle left it, and the sheet covers it. Where the card floats in
 * the top-left corner (`@float:`), it stays at the map's bottom left.
 */
export function MapCreditsDock({ isDocked, onOpen, buttonRef }: MapCreditsDockProps) {
  const y = isDocked ? `max(var(--dock-y, 100%), ${slide('middle')})` : '100%';
  return (
    <div
      className={
        'pointer-events-none absolute inset-0 z-[5] ' +
        'transition-[translate] duration-sheet ease-enter in-data-dock-dragging:transition-none motion-reduce:transition-none ' +
        '@float:translate-none!'
      }
      style={{ translate: `0 ${y}` }}
    >
      <div
        className={
          'pointer-events-auto absolute bottom-full left-[calc(0.75rem+env(safe-area-inset-left))] flex @float:bottom-[max(0.75rem,env(safe-area-inset-bottom))] @float:mb-0 ' +
          (isDocked ? 'mb-3' : 'mb-[max(0.75rem,env(safe-area-inset-bottom))]')
        }
      >
        <CreditsButton ref={buttonRef} onClick={onOpen} />
      </div>
    </div>
  );
}
