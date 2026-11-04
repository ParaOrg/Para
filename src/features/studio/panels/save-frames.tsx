import type { ReactNode } from 'react';

import { BESIDE, OVERLAY, PANEL } from './sheet';

interface SaveFrameProps {
  children: ReactNode;
}

/** A save form over the map: a card in the middle, or the whole screen on a phone. */
export function SaveSheetFrame({ children }: SaveFrameProps) {
  return (
    <div className={OVERLAY}>
      <div className={PANEL}>{children}</div>
    </div>
  );
}

/**
 * A route's save form beside the map on a computer, open the whole time the
 * line is drawn. Not a dialog: the map beside it stays live, so it traps no
 * focus; the form's heading names it, and Tab reaches it after the map.
 */
export function SaveBesideFrame({ children }: SaveFrameProps) {
  return (
    <div data-testid="route-panel" className={BESIDE}>
      {children}
    </div>
  );
}
