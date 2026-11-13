import { useId, useRef, type RefObject } from 'react';

import { StopNotesTimeline } from './stop-notes-timeline';
import { StopNotesTitle } from './stop-notes-title';
import type { StopNotesData } from './stop-notes-view';
import { useStopPlaces } from './use-stop-places';

interface StopNotesSectionProps {
  stopNotes: StopNotesData;
  /** Where focus goes when the last stop is deleted and this section unmounts with its heading. */
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  /** True while a stop's map, its question or a note editor is open: the form holds its countdown. */
  onHoldChange?: (isHeld: boolean) => void;
}

/**
 * The save form's Stops notes (4725:29379): the title and flag count, then the ride's stops on
 * their timeline, each note written in place and each stop's map a tap away. Nothing shows for a
 * ride with no flags.
 */
export function StopNotesSection({
  stopNotes,
  fallbackFocusRef,
  onHoldChange,
}: StopNotesSectionProps) {
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
        fallbackFocusRef={fallbackFocusRef}
        onHoldChange={onHoldChange}
        isFlush
        onNoteMark={onNoteMark}
        onDeleteMark={onDeleteMark}
      />
    </section>
  );
}
