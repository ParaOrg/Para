import { Suspense, type Ref } from 'react';

import { FlagStopButton, StopNotesButton } from './lazy-screens';
import { MAX_MARKS } from './recorder/recording-marks';
import type { Phase } from './recorder/recording-state';
import type { MarkRow } from './storage/recording-schema';
import type { TutorialDemo } from './tutorial/tutorial-steps';

interface FlagStopMarkProps {
  isRecordingShown: boolean;
  phase: Phase;
  /** The recording's flags so far: a ride that holds the most can flag no more. */
  marks: readonly MarkRow[] | undefined;
  /** The tutorial's demo recording, drawn in Start's place: it gets a flag button that does nothing. */
  demo: TutorialDemo;
  onFlag: () => void;
  /** The recording's Flag a stop, for focus to come back to. */
  buttonRef: Ref<HTMLButtonElement>;
  /** Stops notes, over Flag a stop once the ride has a flag. */
  onOpenNotes: () => void;
  notesButtonRef: Ref<HTMLButtonElement>;
}

/**
 * What the map holds in its flag button's place: the recording's Flag a stop, with Stops notes over
 * it once the ride has a flag, the tutorial demo's inert twin, or nothing.
 */
export function FlagStopMark({
  isRecordingShown,
  phase,
  marks,
  demo,
  onFlag,
  buttonRef,
  onOpenNotes,
  notesButtonRef,
}: FlagStopMarkProps) {
  if (isRecordingShown) {
    return (
      <Suspense fallback={null}>
        {marks && marks.length > 0 && (
          <StopNotesButton count={marks.length} onOpen={onOpenNotes} buttonRef={notesButtonRef} />
        )}
        <FlagStopButton
          isRecording={phase === 'recording'}
          canFlag={(marks?.length ?? 0) < MAX_MARKS}
          onFlag={onFlag}
          buttonRef={buttonRef}
        />
      </Suspense>
    );
  }
  if (demo === null) return null;
  // The demo's: where a recording's stands, and it flags nothing. Inert, as the rest of the demo
  // is: under the tutorial's overlay, never focused or pressed.
  return (
    <div inert className="contents">
      <Suspense fallback={null}>
        <FlagStopButton isRecording={demo === 'recording'} canFlag onFlag={() => undefined} />
      </Suspense>
    </div>
  );
}
