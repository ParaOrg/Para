import { useId, useRef } from 'react';

import { StopNotesTimeline } from './stop-notes-timeline';
import { StopNotesTitle } from './stop-notes-title';
import type { StopNotesData } from './stop-notes-view';
import { useStopPlaces } from './use-stop-places';

interface StopNotesSectionProps {
  stopNotes: StopNotesData;
}

/**
 * The save form's Stops notes (4725:29379): the title and flag count, then the ride's stops on
 * their timeline, each note written in place and each stop's map a tap away. Nothing shows for a
 * ride with no flags.
 */
export function StopNotesSection({ stopNotes }: StopNotesSectionProps) {
  const { marks, trail, isTrailReading = false, onNoteMark, onDeleteMark } = stopNotes;
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const points = marks.map((_, at) => trail?.marks[at]?.at ?? null);
  const places = useStopPlaces(points, isTrailReading);
  if (marks.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <StopNotesTitle id={headingId} count={marks.length} headingRef={headingRef} />
      <StopNotesTimeline
        marks={marks}
        places={places}
        points={points}
        trail={trail}
        headingRef={headingRef}
        isFlush
        onNoteMark={onNoteMark}
        onDeleteMark={onDeleteMark}
      />
    </section>
  );
}
