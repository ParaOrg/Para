import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';

import { useIsToolbarHeld } from './toolbar-hold';
import { TOOLBAR_PLACE } from './toolbar-place';

interface ToolbarPlaceProps {
  /** Under something that holds the page (the credits): out of reach, still in sight. */
  isOutOfReach: boolean;
  children: ReactNode;
}

/**
 * Where the page's toolbar stands (TOOLBAR_PLACE): out of sight and out of reach while a question
 * is asked on the screen under it (toolbar-hold.tsx).
 */
export function ToolbarPlace({ isOutOfReach, children }: ToolbarPlaceProps) {
  const isHeld = useIsToolbarHeld();
  return (
    <div inert={isOutOfReach || isHeld} className={cn(TOOLBAR_PLACE, isHeld && 'invisible')}>
      {children}
    </div>
  );
}
