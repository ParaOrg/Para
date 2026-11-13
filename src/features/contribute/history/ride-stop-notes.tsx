import type { RideFacts } from './ride-facts';
import { StopNotesView } from '../stop-notes/stop-notes-view';
import type { Recording } from '../storage/recording-schema';

interface RideStopNotesProps {
  recording: Recording;
  facts: RideFacts | null;
  onClose: () => void;
}

/**
 * A saved ride's Stops notes, read only: History never changes what was uploaded. Each stop's
 * place comes from the trail History drew, so a ride not on this phone names none.
 */
export function RideStopNotes({ recording, facts, onClose }: RideStopNotesProps) {
  const marks = recording.marks ?? [];
  const points = marks.map((_, at) => facts?.trail?.marks[at]?.at ?? null);
  return (
    <div className="pointer-events-auto">
      <StopNotesView view={{ kind: 'screen' }} stopNotes={{ marks, points }} onClose={onClose} />
    </div>
  );
}
