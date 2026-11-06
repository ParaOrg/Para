import { useEffect, useRef, type RefObject } from 'react';

import { TrackRoutesCard } from './track-routes-card';

interface TrackRoutesOfferProps {
  /** Start Tutorial. */
  onTutorial: () => void;
  /** Later, Escape or a tap outside: closes the offer and does nothing else. */
  onClose: () => void;
  /** The ?, whose own tap is not "outside": it is what opens the offer. */
  helpButtonRef: RefObject<HTMLButtonElement | null>;
}

/**
 * The card under Record's ? (Figma 4569:8507): 52 under the status bar, 20 in either side, over the
 * map and with no dimming. Focus moves to its heading as it opens, so Tab reaches Later, then
 * Start Tutorial.
 */
export function TrackRoutesOffer({ onTutorial, onClose, helpButtonRef }: TrackRoutesOfferProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  useEffect(() => {
    const handleOutsideTap = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (cardRef.current?.contains(event.target)) return;
      if (helpButtonRef.current?.contains(event.target)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('click', handleOutsideTap, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleOutsideTap, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, helpButtonRef]);
  return (
    <div
      ref={cardRef}
      className="absolute inset-x-5 top-[calc(env(safe-area-inset-top)+3.25rem)] z-30"
    >
      <TrackRoutesCard onTutorial={onTutorial} onLater={onClose} headingRef={headingRef} />
    </div>
  );
}
