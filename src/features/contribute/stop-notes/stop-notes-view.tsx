import type { RecordingTrail } from '@/features/routes/map/recording-trail';

import { StopNoteCard } from './stop-note-card';
import { StopNotesScreen } from './stop-notes-screen';
import { useStopPlaces } from './use-stop-places';
import type { MarkRow } from '../storage/recording-schema';

/** A ride's flagged stops, where each was, and what may be done to them. */
export interface StopNotesData {
  marks: readonly MarkRow[];
  /** The ride's trail with each flag's pin, in the marks' order; null for none. */
  trail: RecordingTrail | null;
  /** The trail is still being read (History's): each stop is still finding its place. */
  isTrailReading?: boolean;
  /** Absent, the stops are read only (History). */
  onNoteMark?: (time: number, note: string) => void;
  onDeleteMark?: (time: number) => void;
}

/** Which of the two opens: one stop's card, from the pill, or the whole Stops notes page. */
export type StopNotesViewKind = { kind: 'card'; time: number } | { kind: 'screen' };

interface StopNotesViewProps {
  view: StopNotesViewKind;
  stopNotes: StopNotesData;
  /** Closed: Cancel or Save on the card, the page's back arrow. */
  onClose: () => void;
}

/**
 * A stop's note card or the Stops notes page, each stop named by the nearest published hotspot.
 * The recording screen loads it lazily (lazy-screens.ts); the save form and History carry it.
 */
export function StopNotesView({ view, stopNotes, onClose }: StopNotesViewProps) {
  const { marks, trail, isTrailReading = false, onNoteMark, onDeleteMark } = stopNotes;
  // Where each flag was: its pin on the trail, none for a ride with no position for it.
  const points = marks.map((_, at) => trail?.marks[at]?.at ?? null);
  const places = useStopPlaces(points, isTrailReading);
  if (view.kind === 'screen') {
    return (
      <StopNotesScreen
        marks={marks}
        places={places}
        points={points}
        trail={trail}
        onBack={onClose}
        onNoteMark={onNoteMark}
        onDeleteMark={onDeleteMark}
      />
    );
  }
  const index = marks.findIndex((mark) => mark.time === view.time);
  if (index < 0) return null;
  return (
    <StopNoteCard
      note={marks[index].note ?? ''}
      place={places[index] ?? ''}
      onCancel={onClose}
      onSave={(note) => {
        onNoteMark?.(view.time, note);
        onClose();
      }}
    />
  );
}
