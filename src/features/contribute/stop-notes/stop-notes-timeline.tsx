import { useEffect, useId, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';

import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import type { LngLat } from '@/shared/utils/geo';

import { StopMapPopup } from './stop-map-popup';
import { StopNoteRow } from './stop-note-row';
import type { RailPlace } from './stop-timeline-rail';
import { HandQuestion } from '../account/hand-question';
import type { MarkRow } from '../storage/recording-schema';

export interface StopNotesTimelineProps {
  /** The ride's flagged stops, in the order they were flagged. */
  marks: readonly MarkRow[];
  /** Each stop's place, in words, and where it is, in the same order. */
  places: readonly string[];
  points: readonly (LngLat | null)[];
  /** The ride's trail with its flags, for a stop's map; null when there is none. */
  trail: RecordingTrail | null;
  /** Where focus goes when a stop is deleted from its map: the stops' heading. */
  headingRef: RefObject<HTMLElement | null>;
  /**
   * Where focus goes when the last stop is deleted and the heading above it has gone with the
   * section (the save form's Discard recordings). Falls back to the heading when absent.
   */
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  /**
   * Called with true while a stop's map, its question or a note editor is open over the list, and
   * false when none is: the save form holds its countdown then, and Stops notes leaves Escape to
   * the overlay.
   */
  onHoldChange?: (isHeld: boolean) => void;
  /** Flush with the column it stands in (the save form's), not 16 in as on Stops notes. */
  isFlush?: boolean;
  /** Absent, the stops are read only (History): notes are read, never written or deleted. */
  onNoteMark?: (time: number, note: string) => void;
  onDeleteMark?: (time: number) => void;
}

function railPlaceOf(index: number, count: number): RailPlace {
  if (count === 1) return 'only';
  if (index === 0) return 'first';
  return index === count - 1 ? 'last' : 'middle';
}

/**
 * The ride's flagged stops on Figma's small timeline (4720:28437), on Stops notes and on the save
 * form (4725:29196): each with its place, "Stop N ›" and its note, written in place. "Stop N ›"
 * opens the stop on its map (4725:29011), where Delete asks first, then takes the whole flag off.
 */
export function StopNotesTimeline({
  marks,
  places,
  points,
  trail,
  headingRef,
  fallbackFocusRef,
  onHoldChange,
  isFlush = false,
  onNoteMark,
  onDeleteMark,
}: StopNotesTimelineProps) {
  const ids = useId();
  const [editingTime, setEditingTime] = useState<number | null>(null);
  const [mapTime, setMapTime] = useState<number | null>(null);
  const [isDeleteAsked, setIsDeleteAsked] = useState(false);
  const mapIndex = marks.findIndex((mark) => mark.time === mapTime);
  const mapButtonId = (time: number) => `${ids}-map-${time}`;
  // A stop's map, its question or a note editor is open over the list.
  const isHeld = mapTime !== null || editingTime !== null;
  useEffect(() => onHoldChange?.(isHeld), [isHeld, onHoldChange]);
  const hideMap = () =>
    flushSync(() => {
      setIsDeleteAsked(false);
      setMapTime(null);
    });
  // Close or Escape: focus comes back to the stop's "Stop N ›". Takes no arguments, so a click
  // handed straight to it can never be taken for a focus target.
  const closeMap = () => {
    const closed = mapTime;
    hideMap();
    const button = closed === null ? null : document.getElementById(mapButtonId(closed));
    (button ?? headingRef.current ?? fallbackFocusRef?.current)?.focus();
  };
  // A stop deleted: its "Stop N ›" has gone, so focus goes to the stops' heading, or to the
  // fallback when the last stop took the heading's section with it (the save form).
  const closeAfterDelete = (wasLast: boolean) => {
    hideMap();
    (wasLast ? (fallbackFocusRef?.current ?? headingRef.current) : headingRef.current)?.focus();
  };

  return (
    <>
      <ol inert={mapTime !== null} className="flex flex-col">
        {marks.map((mark, index) => (
          <StopNoteRow
            key={mark.time}
            place={places[index] ?? ''}
            stopNumber={index + 1}
            note={mark.note}
            railPlace={railPlaceOf(index, marks.length)}
            onOpenMap={() => setMapTime(mark.time)}
            mapButtonId={mapButtonId(mark.time)}
            isFlush={isFlush}
            isEditing={editingTime === mark.time}
            {...(onNoteMark && {
              onEdit: () => setEditingTime(mark.time),
              onCancel: () => setEditingTime(null),
              onSave: (note: string) => {
                onNoteMark(mark.time, note);
                setEditingTime(null);
              },
            })}
          />
        ))}
      </ol>
      {mapIndex >= 0 && (
        <StopMapPopup
          trail={trail}
          at={points[mapIndex] ?? null}
          place={places[mapIndex] ?? ''}
          stopName={`Stop ${mapIndex + 1}`}
          count={marks.length}
          onClose={closeMap}
          onDelete={onDeleteMark && (() => setIsDeleteAsked(true))}
          isUnderQuestion={isDeleteAsked}
        />
      )}
      {mapTime !== null && isDeleteAsked && onDeleteMark && (
        <HandQuestion
          title="Delete this stop?"
          text="Its note goes with it."
          error={null}
          confirmLabel="Delete"
          confirmVariant="plain-error"
          busyLabel="Deleting…"
          cancelLabel="Keep"
          isBusy={false}
          onConfirm={() => {
            // The last stop deleted, the heading above it goes with its section: send focus to the
            // fallback (or the heading) at once, before it unmounts and leaves it on the page body.
            const wasLast = marks.length === 1;
            onDeleteMark(mapTime);
            closeAfterDelete(wasLast);
          }}
          onCancel={() => setIsDeleteAsked(false)}
        />
      )}
    </>
  );
}
