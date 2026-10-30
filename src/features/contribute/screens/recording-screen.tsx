import { useEffect, useRef, useState } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { CloseIcon } from '@/shared/ui/route-icons';

import { RecordingCard, type RecordingCardState } from './recording-card';
import { RecordingTint } from './recording-tint';
import { TrackingButton } from './tracking-button';
import { ConfirmDelete } from '../common/confirm-delete';
import { useStackRoom } from '../common/use-stack-room';
import type { RecordingFigures } from '../recorder/recording-figures';
import type { Mode } from '../recorder/recording-rules';

interface RecordingScreenProps {
  figures: RecordingFigures;
  mode: Mode;
  /** Paused for now: Resume and Finish replace Pause and the mode button. */
  isPaused: boolean;
  /** Whether the screen is being kept awake. */
  isAwake: boolean;
  /** Focus the Pause bar as the screen opens, not its heading: back from Keep recording. */
  shouldFocusPause: boolean;
  onPause: () => void;
  onResume: () => void;
  onModeSwitch: () => void;
  /** Ends the recording and opens the Save form. */
  onFinish: () => void;
  /** Throws the recording away, once the contributor has said yes. */
  onDiscard: () => void;
}

const CARD_STATE = { walk: 'lakad', ride: 'sakay' } satisfies Record<Mode, RecordingCardState>;

/**
 * While recording, or paused (Figma's "Starting" frames 4480:14235, 4481:23795
 * and 4481:23633): the map's edges tinted for the state, ✕ at the top left,
 * and the recording card with Pause and the mode button, or Resume and Finish.
 */
export function RecordingScreen({
  figures,
  mode,
  isPaused,
  isAwake,
  shouldFocusPause,
  onPause,
  onResume,
  onModeSwitch,
  onFinish,
  onDiscard,
}: RecordingScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stackRef = useStackRoom();
  const pauseRef = useRef<HTMLButtonElement>(null);
  // The heading takes focus as the screen opens, a screen reader starting at its top; back from
  // Keep recording it is the Pause bar, where the contributor was before.
  useEffect(() => {
    (shouldFocusPause ? pauseRef.current : headingRef.current)?.focus();
    // Once, as the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a change of the prop alone must not move focus
  }, []);
  const [isAsking, setIsAsking] = useState(false);
  const closeRef = useRef<HTMLDivElement>(null);
  const wasAsking = useRef(false);

  // Back from the question, focus returns to ✕, which asked it.
  useEffect(() => {
    if (wasAsking.current && !isAsking) closeRef.current?.querySelector('button')?.focus();
    wasAsking.current = isAsking;
  }, [isAsking]);

  const state: RecordingCardState = isPaused ? 'paused' : CARD_STATE[mode];

  return (
    <>
      <RecordingTint state={state} />
      <div
        ref={closeRef}
        className="absolute top-0 left-0 z-30 pt-[max(1rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))]"
      >
        <IconButton
          tooltip="top"
          size="large"
          label="Discard recording"
          icon={<CloseIcon />}
          onClick={() => setIsAsking(true)}
        />
      </div>
      {isAsking && (
        <div className="absolute inset-x-4 top-[calc(max(1rem,env(safe-area-inset-top))+3.5rem)] z-30">
          <ConfirmDelete
            question="Throw this recording away?"
            onConfirm={onDiscard}
            onKeep={() => setIsAsking(false)}
          />
        </div>
      )}
      <section
        ref={stackRef}
        aria-labelledby="recording-heading"
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        <h1 id="recording-heading" ref={headingRef} tabIndex={-1} className="sr-only">
          {isPaused ? 'Recording paused' : 'Recording a route'}
        </h1>
        {!isAwake && !isPaused && (
          <p className="bg-surface p-2 font-sn-pro text-sm/5 text-content-primary">
            The screen could not be kept awake, so it may sleep and the location may stop.
          </p>
        )}
        <RecordingCard
          elapsedSeconds={figures.elapsedSeconds}
          distanceM={figures.distanceM}
          state={state}
        >
          {isPaused ? (
            <>
              <TrackingButton variant="resume" corner="bottom-left" onClick={onResume} />
              <TrackingButton variant="finish" corner="bottom-right" onClick={onFinish} />
            </>
          ) : (
            <>
              <TrackingButton
                ref={pauseRef}
                variant="pause"
                corner="bottom-left"
                onClick={onPause}
              />
              <TrackingButton
                variant={mode === 'walk' ? 'sakay' : 'lakad'}
                corner="bottom-right"
                onClick={onModeSwitch}
              />
            </>
          )}
        </RecordingCard>
      </section>
    </>
  );
}
