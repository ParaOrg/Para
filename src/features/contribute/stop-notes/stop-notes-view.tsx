import type { LngLat } from '@/shared/utils/geo';

import { StopNoteCard } from './stop-note-card';
import { StopNotesScreen } from './stop-notes-screen';
import { useStopPlaces } from './use-stop-places';
import type { MarkRow } from '../storage/recording-schema';

/** A ride's flagged stops, where each was, and what may be done to them. */
export interface StopNotesData {
  marks: readonly MarkRow[];
  /** Where each flag was, in the same order; null where the ride has no position for it. */
  points: readonly (LngLat | null)[];
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
  /** A note saved from the card: the page says so in a toast. */
  onCardSaved?: () => void;
}

/**
 * A stop's note card or the Stops notes page, each stop named by the nearest published hotspot.
 * The recording screen loads it lazily (lazy-screens.ts); the save form and History carry it.
 */
export function StopNotesView({ view, stopNotes, onClose, onCardSaved }: StopNotesViewProps) {
  const { marks, points, onNoteMark, onDeleteMark } = stopNotes;
  const places = useStopPlaces(points);
  if (view.kind === 'screen') {
    return (
      <StopNotesScreen
        marks={marks}
        places={places}
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
        onCardSaved?.();
        onClose();
      }}
    />
  );
}
