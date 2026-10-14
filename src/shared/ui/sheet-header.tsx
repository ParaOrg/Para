import type { ReactNode } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';

import { CloseIcon } from './route-icons';

interface SheetHeaderProps {
  /** What ✕ does: the card's close, as Escape is the sheet's. */
  onClose: () => void;
  children: ReactNode;
}

/**
 * The header a hotspot's card and the studio's route card have always had:
 * what was tapped, and ✕ — the route cards' own IconButton since the
 * owner's yes of 2026-09-30, so every card closes the same way. The route
 * list and a trip's card bring their own header (RouteCardHeader). Their
 * bodies sit 16 in, as this does (px-4).
 */
export function SheetHeader({ onClose, children }: SheetHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 px-4">
      <div className="min-w-0 flex-1">{children}</div>
      <IconButton icon={<CloseIcon />} label="Close" tooltip="top" onClick={onClose} />
    </div>
  );
}
