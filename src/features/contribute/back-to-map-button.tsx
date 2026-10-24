import type { ReactNode } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { ChevronLeftIcon } from '@/shared/ui/route-icons';

interface BackToMapButtonProps {
  /** Buttons that sit beside Back, as History does on Ready. */
  children?: ReactNode;
}

/** Leaving is safe on every screen: a ride is written to the phone as it is recorded. */
export const goBackToMap = () => window.location.assign('/');

/** The top-left way out of the contributor page, to the public map. */
export function BackToMapButton({ children }: BackToMapButtonProps) {
  return (
    // Above the Saved screen, which covers the page.
    <div className="absolute top-0 left-0 z-30 flex gap-2 pt-[max(1rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))]">
      <IconButton
        tooltip="top"
        size="large"
        label="Back to the map"
        icon={<ChevronLeftIcon />}
        onClick={goBackToMap}
      />
      {children}
    </div>
  );
}
