import { useEffect, useRef, useState } from 'react';

import type { RideDetail } from './ride-detail-screen';
import { HandQuestion } from '../account/hand-question';
import { useClosedWhenHidden } from '../common/use-closed-when-hidden';

/**
 * Delete this record on the ride's screen, asked first (Figma 4569:5015): whether the question
 * shows, how Delete this record asks it, and the question itself, to draw over the screen while it
 * shows. Keep recording hands focus back to the button that asked.
 */
export function useRideDeleteQuestion(ride: RideDetail | null) {
  const [isAsking, setIsAsking] = useState(false);
  useClosedWhenHidden(setIsAsking, false);
  const deleteRef = useRef<HTMLDivElement>(null);
  const shouldReturnFocus = useRef(false);

  useEffect(() => {
    if (isAsking || !shouldReturnFocus.current) return;
    shouldReturnFocus.current = false;
    deleteRef.current?.querySelector('button')?.focus();
  }, [isAsking]);

  const handleKeep = () => {
    shouldReturnFocus.current = true;
    setIsAsking(false);
  };

  const question = ride && isAsking && (
    // Deleted, the ride is gone from History and its screen leaves by itself (history-view.tsx).
    <div className="pointer-events-auto">
      <HandQuestion
        title="You want to remove this recording?"
        text={null}
        error={null}
        confirmLabel="Delete this record"
        confirmVariant="plain-error"
        busyLabel="Delete this record"
        cancelLabel="Keep recording"
        isBusy={false}
        onConfirm={ride.onDelete}
        onCancel={handleKeep}
      />
    </div>
  );
  return { isAsking, ask: () => setIsAsking(true), deleteRef, question };
}
