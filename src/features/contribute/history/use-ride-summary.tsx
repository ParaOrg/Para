import { useEffect, useMemo, useRef, useState } from 'react';

import type { RideDetail } from './ride-detail-screen';
import { rideSummaryOf } from './ride-summary';
import { RideSummaryPreview } from './ride-summary-preview';
import { useClosedWhenHidden } from '../common/use-closed-when-hidden';

/**
 * The ride's summary card on its screen: whether it shows, how Share ride summary opens it, and
 * the card itself, to draw over the screen while it shows.
 */
export function useRideSummary(ride: RideDetail | null) {
  const [isShowing, setIsShowing] = useState(false);
  useClosedWhenHidden(setIsShowing, false);
  const recording = ride?.recording;
  const facts = ride?.facts ?? null;
  // Memoised so the card is drawn once per opening, not on each render of the screen.
  const summary = useMemo(
    () => (recording ? rideSummaryOf(recording, facts) : null),
    [recording, facts],
  );

  // Close hands focus back to Share ride summary, which was inert under the card.
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (isShowing) return;
    opener.current?.focus();
    opener.current = null;
  }, [isShowing]);

  const open = () => {
    if (document.activeElement instanceof HTMLElement) opener.current = document.activeElement;
    setIsShowing(true);
  };

  const card = ride && summary && isShowing && (
    <div className="pointer-events-auto">
      <RideSummaryPreview
        summary={summary}
        trail={ride.trail}
        startedAt={ride.recording.startedAt}
        onClose={() => setIsShowing(false)}
      />
    </div>
  );
  return { isShowing, open, card };
}
