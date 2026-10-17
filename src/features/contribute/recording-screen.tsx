import { useEffect, useRef, useState } from 'react';

import type { RideSummary } from '@/features/routes/model/ride-recording';

import { ConfirmDelete } from './confirm-delete';
import type { LegName } from './ride-rules';
import { StatsStrip } from './stats-strip';
import { TrackingButton } from './tracking-button';
import { useFocusHeading } from './use-focus-heading';

interface RecordingScreenProps {
  summary: RideSummary;
  leg: LegName;
  /** Stopped for now: Resume replaces Stop. */
  isPaused: boolean;
  /** Whether the screen is being kept awake. */
  isAwake: boolean;
  onStop: () => void;
  onResume: () => void;
  onLegSwitch: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const OTHER_LEG = { papunta: 'pabalik', pabalik: 'papunta' } satisfies Record<LegName, LegName>;

/** While recording, or stopped for a while: the figures over Stop (or Resume), and the row of Pabalik, Save and Cancel. */
export function RecordingScreen({
  summary,
  leg,
  isPaused,
  isAwake,
  onStop,
  onResume,
  onLegSwitch,
  onSave,
  onCancel,
}: RecordingScreenProps) {
  const headingRef = useFocusHeading();
  const [isAsking, setIsAsking] = useState(false);
  const cancelRef = useRef<HTMLDivElement>(null);
  const wasAsking = useRef(false);

  // Back from the question, focus returns to the button that asked it.
  useEffect(() => {
    if (wasAsking.current && !isAsking) {
      cancelRef.current?.querySelector<HTMLButtonElement>('button[aria-label="Cancel"]')?.focus();
    }
    wasAsking.current = isAsking;
  }, [isAsking]);

  const elapsedSeconds = summary.movingSeconds + summary.standingSeconds + summary.lostSeconds;

  return (
    <section
      aria-labelledby="recording-heading"
      className="absolute inset-x-0 bottom-0 z-10 flex flex-col pb-[env(safe-area-inset-bottom)]"
    >
      <h1 id="recording-heading" ref={headingRef} tabIndex={-1} className="sr-only">
        {isPaused ? 'Recording stopped' : 'Recording a ride'}
      </h1>
      {!isAwake && !isPaused && (
        <p className="mx-4 mb-2 bg-surface p-2 font-sn-pro text-sm/5 text-content-primary">
          The screen could not be kept awake, so it may sleep and the location may stop.
        </p>
      )}
      <StatsStrip
        elapsedSeconds={elapsedSeconds}
        distanceM={summary.distanceM}
        leg={leg}
        isPaused={isPaused}
      />
      {isPaused ? (
        <TrackingButton variant="resume" onClick={onResume} />
      ) : (
        <TrackingButton variant="stop" isActive onClick={onStop} />
      )}
      {isAsking ? (
        <ConfirmDelete
          question="Throw this recording away?"
          onConfirm={onCancel}
          onKeep={() => setIsAsking(false)}
        />
      ) : (
        <div ref={cancelRef} className="flex">
          <TrackingButton variant={OTHER_LEG[leg]} onClick={onLegSwitch} />
          <TrackingButton variant="save" onClick={onSave} />
          <TrackingButton variant="cancel" onClick={() => setIsAsking(true)} />
        </div>
      )}
    </section>
  );
}
