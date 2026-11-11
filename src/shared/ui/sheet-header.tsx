import type { ReactNode } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';

import { CloseIcon } from './route-icons';

interface SheetHeaderProps {
  /** What ✕ does: the card's close, as Escape is the sheet's. */
  onClose: () => void;
  children: ReactNode;
}

/**
 * The header of the studio's hotspot card (HotspotCard): what was
 * tapped, and ✕ — the route cards' own IconButton, the owner's pick, so every
 * card closes the same way. The route list and a trip close from their own
 * Controller instead. Their bodies sit 16 in, as this does (px-4).
 *
 * A page that builds its own Tailwind with source(none) must @source this file: its
 * classes are not seen otherwise (contribute.css does).
 */
export function SheetHeader({ onClose, children }: SheetHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 px-4">
      <div className="min-w-0 flex-1">{children}</div>
      <IconButton icon={<CloseIcon />} label="Close" tooltip="top" onClick={onClose} />
    </div>
  );
}
