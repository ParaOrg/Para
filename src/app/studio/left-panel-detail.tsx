import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { isPanelReachable } from '@/features/studio';
import { useEscape } from '@/shared/hooks/use-escape';

interface LeftPanelDetailProps {
  /** The left panel area's host, beside the map, hidden on the studio's other maps. */
  leftPanel: HTMLElement;
  /** Escape's move: what a phone's sheet does with it (the trip's leaveTrip, a draft's close). */
  onLeave: () => void;
  children: ReactNode;
}

/**
 * A route line detail on a computer, in the left panel area beside the map: it is no sheet, so
 * Escape is answered here, as a sheet answers it. On the other maps the host is hidden and the
 * detail waits, and under the credits or an account dialog it is out of reach: their Escape is
 * theirs (isPanelReachable).
 */
export function LeftPanelDetail({ leftPanel, onLeave, children }: LeftPanelDetailProps) {
  const handleEscape = () => {
    if (isPanelReachable(leftPanel)) onLeave();
  };
  useEscape(handleEscape);
  return createPortal(children, leftPanel);
}
