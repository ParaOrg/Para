import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import type { RideDetail } from './ride-detail-screen';
import { RideStopNotes } from './ride-stop-notes';
import { useClosedWhenHidden } from '../common/use-closed-when-hidden';

/**
 * The ride's Stops notes on its screen, read only (History never changes an upload's notes):
 * whether the page shows, the way into it from the sheet, and the page itself, to draw over the
 * screen while it shows. Closed, focus goes back to the way in.
 */
export function useRideStopNotes(ride: RideDetail | null) {
  const [isOpen, setIsOpen] = useState(false);
  useClosedWhenHidden(setIsOpen, false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    flushSync(() => setIsOpen(false));
    buttonRef.current?.focus();
  };

  const page = ride && isOpen && <RideStopNotes recording={ride.recording} onClose={close} />;
  return { isOpen, open: () => setIsOpen(true), buttonRef, page };
}
